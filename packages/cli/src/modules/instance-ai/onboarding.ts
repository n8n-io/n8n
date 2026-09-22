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
	INSTANCE_AI_ONBOARDING_OPENINGS_DIR,
	loadInstanceAiRuntimeSkillSource,
	orchestratorAgentId,
} from '@n8n/instance-ai';
import { UnexpectedError } from 'n8n-workflow';
import { nanoid } from 'nanoid';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
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
/** File under `@n8n/instance-ai/onboarding` (without `.yaml`) that opens every onboarding thread. */
const OPENING_ID = 'cloud-form';

/**
 * Marks the host-seeded card's confirmation request so the confirm endpoint can tell it from a
 * card that has a run behind it. Fits the 36-char `requestId` column together with a nanoid.
 */
const CARD_REQUEST_ID_PREFIX = 'onboarding-';
/** Start of the `${N8N_*}` placeholders the sandbox materializer substitutes; split so the lint rule for interpolation does not fire. */
const PRELOAD_FORBIDDEN_PLACEHOLDER_PREFIX = '$' + '{N8N_';
type Question = z.infer<typeof instanceAiQuestionSchema>;
type GivenAnswer = Extract<InstanceAiConfirmRequest, { kind: 'questions' }>['answers'][number];
/** One answer in the `ask-user` result shape: the wire answer plus the question text. */
type Answer = GivenAnswer & { question: string };

/** `onboarding/cloud-form.yaml` in `@n8n/instance-ai`: the copy shown before the agent's first turn. */
const openingSchema = z.object({
	title: z.string().min(1),
	greeting: z.string().min(1),
	/** Steps of the one `ask-user` card shown before the agent's first turn, in this order. */
	questions: z.array(instanceAiQuestionSchema).min(1),
});

interface Onboarding {
	/** Body of the preloaded skill, sent with the opening turn. */
	instructions: string;
	opening: z.infer<typeof openingSchema>;
}

/**
 * The opening file is read every time, so an edit shows on the next new thread. The skill body
 * goes to the model as is. The sandbox materializer substitutes `${N8N_*}` placeholders only in
 * the skills it writes to the workspace, so a placeholder here would reach the shell as an unset
 * variable. Fail here, at thread creation, instead of in the agent's first command.
 */
export async function loadOnboarding(): Promise<Onboarding> {
	const [skill, openingFile] = await Promise.all([
		loadInstanceAiRuntimeSkillSource().loadSkill(ONBOARDING_SKILL_ID),
		readFile(join(INSTANCE_AI_ONBOARDING_OPENINGS_DIR, `${OPENING_ID}.yaml`), 'utf-8'),
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
		// Load the opening before the thread exists, so a broken opening file creates nothing.
		const { opening } = await loadOnboarding();
		const response = await this.memoryService.ensureThread(
			user.id,
			threadId,
			projectId,
			launchMetadata,
		);
		if (!response.created) return response;

		const greeting = opening.greeting.replace('{{firstName}}', user.firstName?.trim() || 'there');
		// The LLM history needs the greeting as an assistant turn; the card lives in the event log.
		const { userMessageId } = await this.memoryService.seedOpeningMessages(
			threadId,
			user.id,
			greeting,
		);
		await this.seedCard({
			threadId,
			userId: user.id,
			messageId: userMessageId,
			title: opening.title,
			text: greeting,
			questions: opening.questions,
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

		const { opening } = await loadOnboarding();
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
			message: buildOnboardingAnswerMessage(answers),
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
