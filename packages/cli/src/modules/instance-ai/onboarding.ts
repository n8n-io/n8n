import {
	instanceAiQuestionSchema,
	type InstanceAiConfirmRequest,
	type InstanceAiEnsureThreadResponse,
	type InstanceAiEvent,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	ASK_USER_TOOL_ID,
	INSTANCE_AI_ONBOARDING_OPENING_FILE,
	loadInstanceAiRuntimeSkillSource,
	loadUseCaseToolOptions,
	orchestratorAgentId,
	rankUseCases,
} from '@n8n/instance-ai';
import { UnexpectedError } from 'n8n-workflow';
import { nanoid } from 'nanoid';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

import { DurableEventLog } from './event-bus/durable-event-log';
import { InProcessEventBus } from './event-bus/in-process-event-bus';
import {
	InstanceAiMemoryService,
	type InstanceAiThreadLaunchMetadata,
} from './instance-ai-memory.service';
import { buildOnboardingAnswerMessage } from './internal-messages';
import { InstanceAiPendingConfirmationRepository } from './repositories/instance-ai-pending-confirmation.repository';

/** Folder id under `@n8n/instance-ai/skills` of the skill preloaded on onboarding threads. */
export const ONBOARDING_SKILL_ID = 'suggest-automations';

/**
 * Marks the host-seeded card's confirmation request so the confirm endpoint can tell it from a
 * card that has a run behind it. Fits the 36-char `requestId` column together with a nanoid.
 */
const CARD_REQUEST_ID_PREFIX = 'onboarding-';
/** Start of the `${N8N_*}` placeholders the sandbox materializer substitutes; split so the lint rule for interpolation does not fire. */
const PRELOAD_FORBIDDEN_PLACEHOLDER_PREFIX = '$' + '{N8N_';
/** `id` of the role question in the opening file's `questions`. */
const ROLE_QUESTION_ID = 'role';
/** `id` of the tools question; its options follow the role answer. */
const TOOLS_QUESTION_ID = 'tools';
/** Use-case corpus role id of a free-text role answer. */
const FALLBACK_ROLE_ID = 'other';

type Question = z.infer<typeof instanceAiQuestionSchema>;
/** One answer in the `ask-user` result shape: the wire answer plus the question text. */
type Answer = Extract<InstanceAiConfirmRequest, { kind: 'questions' }>['answers'][number] & {
	question: string;
};

/** The opening file next to the use-case corpus: the copy shown before the agent's first turn. */
const openingSchema = z.object({
	title: z.string().min(1),
	greeting: z.string().min(1),
	/** Steps of the one `ask-user` card shown before the agent's first turn, in this order. */
	questions: z.array(instanceAiQuestionSchema).min(1),
	/** Role option to use-case corpus role id; answers outside the map land in `other`. */
	roles: z.record(z.string(), z.string()),
});
type Opening = z.infer<typeof openingSchema>;

interface OnboardingSkill {
	/** SKILL.md body, preloaded on the opening turn. */
	instructions: string;
	opening: Opening;
}

/**
 * The skill body goes to the model as is. The sandbox materializer substitutes `${N8N_*}`
 * placeholders only in the skills it writes to the workspace, so a placeholder here would reach
 * the shell as an unset variable. Fail here, at thread creation, instead of in the agent's first
 * command. The opening file is read every time, so an edit shows on the next new thread.
 */
export async function loadOnboardingSkill(): Promise<OnboardingSkill> {
	const [skill, openingFile] = await Promise.all([
		loadInstanceAiRuntimeSkillSource().loadSkill(ONBOARDING_SKILL_ID),
		readFile(INSTANCE_AI_ONBOARDING_OPENING_FILE, 'utf-8'),
	]);
	if (!skill) throw new UnexpectedError(`Runtime skill "${ONBOARDING_SKILL_ID}" not found`);
	if (skill.instructions.includes(PRELOAD_FORBIDDEN_PLACEHOLDER_PREFIX)) {
		throw new UnexpectedError(
			`Runtime skill "${ONBOARDING_SKILL_ID}" is preloaded and must not use \${N8N_*} placeholders`,
		);
	}
	return {
		instructions: skill.instructions,
		opening: openingSchema.parse(parseYaml(openingFile)),
	};
}

/** Resolved here, not by the agent, so the suggestions always come from an existing role file. */
function resolveRoleId(opening: Opening, answers: Answer[]): string {
	const roleAnswer = answers.find((answer) => answer.questionId === ROLE_QUESTION_ID);
	return (
		Object.entries(opening.roles).find(([label]) =>
			roleAnswer?.selectedOptions.includes(label),
		)?.[1] ?? FALLBACK_ROLE_ID
	);
}

/** Selected options plus the free text, as the agent gets them. */
function resolveTools(answers: Answer[]): string[] {
	const toolsAnswer = answers.find((answer) => answer.questionId === TOOLS_QUESTION_ID);
	const customText = toolsAnswer?.customText?.trim();
	return [...(toolsAnswer?.selectedOptions ?? []), ...(customText ? [customText] : [])];
}

/**
 * The tools step follows the role step: one option list per role option, read from the role's
 * use cases on the host, and `other`'s list for a free-text role. Any other question is shown
 * as the opening file defines it.
 */
async function toCardQuestion(opening: Opening, question: Question): Promise<Question> {
	if (question.id !== TOOLS_QUESTION_ID || question.options) return question;
	const options: Record<string, string[]> = {};
	for (const [label, roleId] of Object.entries(opening.roles)) {
		options[label] = await loadUseCaseToolOptions(roleId);
	}
	return {
		...question,
		options: await loadUseCaseToolOptions(FALLBACK_ROLE_ID),
		optionsByAnswer: { questionId: ROLE_QUESTION_ID, options },
	};
}

/**
 * The agent-first onboarding thread. The greeting and one question card are stored before the
 * agent's first turn, the card as a finished synthetic run whose `ask-user` call still waits
 * for an answer. The UI shows, answers and restores the card through the same HITL path as a
 * live one; the answer starts the first real turn.
 */
@Service()
export class InstanceAiOnboardingService {
	constructor(
		private readonly memoryService: InstanceAiMemoryService,
		private readonly eventBus: InProcessEventBus,
		private readonly eventLog: DurableEventLog,
		private readonly pendingConfirmationRepo: InstanceAiPendingConfirmationRepository,
	) {}

	async ensureThread(
		user: User,
		threadId: string,
		projectId: string,
		launchMetadata: InstanceAiThreadLaunchMetadata,
	): Promise<InstanceAiEnsureThreadResponse> {
		const response = await this.memoryService.ensureThread(
			user.id,
			threadId,
			projectId,
			launchMetadata,
		);
		if (!response.created) return response;

		const { opening } = await loadOnboardingSkill();
		const greeting = opening.greeting.replace('{{firstName}}', user.firstName?.trim() || 'there');
		// The LLM history needs the greeting as an assistant turn; the card lives in the event log.
		const { userMessageId } = await this.memoryService.seedOpeningMessages(
			threadId,
			user.id,
			greeting,
		);
		const questions: Question[] = [];
		for (const question of opening.questions) {
			questions.push(await toCardQuestion(opening, question));
		}
		await this.seedCard({
			threadId,
			userId: user.id,
			messageId: userMessageId,
			title: opening.title,
			text: greeting,
			questions,
		});
		return response;
	}

	/**
	 * Settle the host-seeded card with the user's answers and return the hidden message that
	 * starts the first turn. Returns `undefined` when `requestId` is not that card (the HITL path
	 * owns it then, and answers a consumed request with 404 like for any card).
	 */
	async answerCard(
		userId: string,
		requestId: string,
		request: InstanceAiConfirmRequest,
	): Promise<{ threadId: string; message: string } | undefined> {
		if (!requestId.startsWith(CARD_REQUEST_ID_PREFIX)) return undefined;
		const row = await this.pendingConfirmationRepo.claim(requestId, userId);
		if (!row?.toolCallId) return undefined;

		const { opening } = await loadOnboardingSkill();
		const given = request.kind === 'questions' ? request.answers : [];
		// One answer per step in card order, with the question text like the `ask-user` tool adds.
		const answers: Answer[] = opening.questions.map((question) => ({
			...(given.find((answer) => answer.questionId === question.id) ?? {
				questionId: question.id,
				selectedOptions: [],
				skipped: true,
			}),
			question: question.question,
		}));
		const roleId = resolveRoleId(opening, answers);
		const tools = resolveTools(answers);
		// Ranked here, not by the agent in the sandbox: the first turn then needs no command.
		const suggestions = await rankUseCases(roleId, tools);
		// Same result shape as the `ask-user` tool, so the UI and the agent read it the same way.
		this.eventBus.publish(row.threadId, {
			type: 'tool-result',
			runId: row.runId,
			agentId: orchestratorAgentId(row.runId),
			payload: { toolCallId: row.toolCallId, result: { answered: true, answers } },
		});
		// Committed before the first turn writes its rows, so the fold keeps the card under the
		// greeting.
		await this.eventLog.flush(row.threadId);
		return {
			threadId: row.threadId,
			message: buildOnboardingAnswerMessage(answers, roleId, tools, suggestions),
		};
	}

	/**
	 * Store the card as a finished synthetic run whose `ask-user` call still waits for an answer,
	 * plus the pending row `answerCard` claims.
	 */
	private async seedCard(card: {
		threadId: string;
		userId: string;
		messageId: string;
		title: string;
		/** Assistant text shown before the card. */
		text: string;
		questions: Question[];
	}): Promise<void> {
		const { threadId, questions } = card;
		const runId = randomUUID();
		// Own group like a real run: history dedupes assistant rows by group inside one visible turn,
		// and the hidden `(continue)` rows open no turn, so a groupless greeting collapses into the
		// first real turn after a reload.
		const messageGroupId = `mg_${nanoid()}`;
		const agentId = orchestratorAgentId(runId);
		const toolCallId = nanoid();
		const requestId = `${CARD_REQUEST_ID_PREFIX}${nanoid()}`;
		const args = { questions };
		const events: InstanceAiEvent[] = [
			{
				type: 'run-start',
				runId,
				agentId,
				payload: { messageId: card.messageId, messageGroupId },
			},
			{ type: 'text-block', runId, agentId, payload: { text: card.text } },
			{
				type: 'tool-call',
				runId,
				agentId,
				payload: { toolCallId, toolName: ASK_USER_TOOL_ID, args },
			},
			{
				type: 'confirmation-request',
				runId,
				agentId,
				payload: {
					requestId,
					toolCallId,
					toolName: ASK_USER_TOOL_ID,
					args,
					severity: 'info',
					message: card.title,
					inputType: 'questions',
					questions,
				},
			},
			// Finished, so the interrupted-run sweeper leaves it alone. A completed run keeps an
			// unanswered card actionable (shared reducer, `run-finish`).
			{ type: 'run-finish', runId, agentId, payload: { status: 'completed' } },
		];
		for (const event of events) this.eventBus.publish(threadId, event);
		// No expiry: nothing could revive the card after a timeout.
		// ponytail: kind 'inline' (no checkpoint) because the column CHECK allows only 'inline' and
		// 'suspended'; a 'seeded' kind needs a migration. The prefix above is the real marker.
		await this.pendingConfirmationRepo.save(
			this.pendingConfirmationRepo.create({
				requestId,
				threadId,
				userId: card.userId,
				kind: 'inline',
				runId,
				messageGroupId,
				toolCallId,
				expiresAt: null,
			}),
		);
		// The client loads the messages right after the response; the fold reads committed rows.
		await this.eventLog.flush(threadId);
	}
}
