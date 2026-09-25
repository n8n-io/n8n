import type {
	InstanceAiConfirmRequest,
	InstanceAiEnsureThreadResponse,
	InstanceAiEvent,
	InstanceAiQuestion,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	ASK_USER_TOOL_ID,
	loadInstanceAiRuntimeSkillSource,
	orchestratorAgentId,
} from '@n8n/instance-ai';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { UnexpectedError } from 'n8n-workflow';
import { nanoid } from 'nanoid';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { Telemetry } from '@/telemetry';

import { DurableEventLog } from './event-bus/durable-event-log';
import { InProcessEventBus } from './event-bus/in-process-event-bus';
import {
	InstanceAiMemoryService,
	type InstanceAiThreadLaunchMetadata,
} from './instance-ai-memory.service';
import { buildOnboardingAnswerMessage } from './internal-messages';
import { ONBOARDING_OPENING } from './onboarding-opening';
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
type Question = InstanceAiQuestion;
type GivenAnswer = Extract<InstanceAiConfirmRequest, { kind: 'questions' }>['answers'][number];
/** One answer in the `ask-user` result shape: the wire answer plus the question text. */
type Answer = GivenAnswer & { question: string };

/**
 * The n8n Cloud signup survey answers the launch context may carry under `survey`, keyed like
 * the cloud stores them in the account `information` (`GET /rest/cloud/proxy/user/me`). Other
 * keys are dropped. The card skips a step the survey answers; the answer still reaches the agent.
 */
const surveySchema = z.object({ what_team_are_you_on: z.string().optional() });
type Survey = z.infer<typeof surveySchema>;
const launchContextSchema = z.object({ survey: surveySchema.optional() });
/** Card question id -> the survey key that answers it. */
// ponytail: one pair; move it into the opening when a second survey-backed question shows up.
const SURVEY_KEY_BY_QUESTION: Partial<Record<string, keyof Survey>> = {
	team: 'what_team_are_you_on',
};

function surveyOf(sourceContext: unknown): Survey {
	const parsed = launchContextSchema.safeParse(sourceContext ?? {});
	if (!parsed.success) throw new BadRequestError('Invalid onboarding survey in sourceContext');
	return parsed.data.survey ?? {};
}

/**
 * Split the opening into the steps the card shows and the answers the survey already gave. A
 * shown step that picks its options from a survey-answered step gets them resolved here: the
 * card resolves `optionsByAnswer` only from its own steps. `{{team}}` in a question text becomes
 * the survey's team. A value outside the step's options (the survey's "Other") names no team:
 * texts drop it and dependents keep their fallback options.
 */
function applySurvey(questions: Question[], survey: Survey) {
	const answered = new Map<string, string>();
	for (const question of questions) {
		const key = SURVEY_KEY_BY_QUESTION[question.id];
		const value = key && survey[key]?.trim();
		if (value) answered.set(question.id, value);
	}
	const known = (id: string) => {
		const value = answered.get(id);
		return value && questions.find((question) => question.id === id)?.options?.includes(value)
			? value
			: '';
	};
	// Without a team the words around the placeholder close up: "in your work".
	const fill = (text: string) =>
		text.replace(/\{\{(\w+)\}\}/g, (_, id: string) => known(id)).replace(/ {2,}/g, ' ');
	const filled = questions.map((question) => ({ ...question, question: fill(question.question) }));
	const shown = filled.flatMap((question) => {
		if (answered.has(question.id)) return [];
		const dependency = question.optionsByAnswer;
		if (!dependency || !answered.has(dependency.questionId)) return [question];
		return [
			{
				...question,
				options: dependency.options[known(dependency.questionId)] ?? question.options,
				optionsByAnswer: undefined,
			},
		];
	});
	return { questions: filled, shown, answered };
}

/** "Gmail", "Gmail and Slack", or "Gmail, Slack, and your other tools" for the follow-up text. */
function mentionApps(apps: string[]): string {
	if (apps.length === 0) return 'your tools';
	if (apps.length <= 2) return apps.join(' and ');
	return `${apps[0]}, ${apps[1]}, and your other tools`;
}

/**
 * Body of the preloaded skill, sent with the opening turn as is. The sandbox materializer
 * substitutes `${N8N_*}` placeholders only in the skills it writes to the workspace, so a
 * placeholder here would reach the shell as an unset variable.
 */
export async function loadOnboardingSkill(): Promise<string> {
	const skill = await loadInstanceAiRuntimeSkillSource().loadSkill(ONBOARDING_SKILL_ID);
	if (!skill) throw new UnexpectedError(`Runtime skill "${ONBOARDING_SKILL_ID}" not found`);
	if (skill.instructions.includes(PRELOAD_FORBIDDEN_PLACEHOLDER_PREFIX)) {
		throw new UnexpectedError(
			`Runtime skill "${ONBOARDING_SKILL_ID}" is preloaded and must not use \${N8N_*} placeholders`,
		);
	}
	return skill.instructions;
}

/**
 * The agent-first onboarding thread. The greeting and one question card are stored before the
 * agent's first turn, the card as a finished synthetic run whose `ask-user` call still waits
 * for an answer. The UI shows, answers and restores the card through the same HITL path as a
 * live one. The answer settles the card and posts the follow-up question the same way, with no
 * model turn; the task the user types next starts the first real turn. Free text in the card
 * starts that turn at once instead, with the answers as the message.
 */
@Service()
export class InstanceAiOnboardingService {
	constructor(
		private readonly memoryService: InstanceAiMemoryService,
		private readonly eventBus: InProcessEventBus,
		private readonly eventLog: DurableEventLog,
		private readonly pendingConfirmationRepo: InstanceAiPendingConfirmationRepository,
		private readonly telemetry: Telemetry,
	) {}

	async ensureThread(
		user: User,
		threadId: string,
		projectId: string,
		launchMetadata: InstanceAiThreadLaunchMetadata,
	): Promise<InstanceAiEnsureThreadResponse> {
		// Read the survey before the thread exists, so a bad survey creates nothing.
		const survey = surveyOf(launchMetadata.sourceContext);
		const { shown } = applySurvey(ONBOARDING_OPENING.questions, survey);
		const response = await this.memoryService.ensureThread(
			user.id,
			threadId,
			projectId,
			launchMetadata,
			ONBOARDING_OPENING.title,
		);
		if (!response.created) return response;

		const greeting = ONBOARDING_OPENING.greeting.replace(
			'{{firstName}}',
			user.firstName?.trim() || 'there',
		);
		// The LLM history needs the greeting as an assistant turn; the card lives in the event log.
		const { userMessageId } = await this.memoryService.seedOpeningMessages(
			threadId,
			user.id,
			greeting,
		);
		await this.seedTurn({
			threadId,
			userId: user.id,
			messageId: userMessageId,
			text: greeting,
			card: { title: ONBOARDING_OPENING.title, questions: shown },
		});
		this.telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_STARTED_AI_ASSISTANT_ONBOARDING, {
			user_id: user.id,
			thread_id: threadId,
			team: survey.what_team_are_you_on?.trim() || null,
		});
		return response;
	}

	/**
	 * Settle the host-seeded card with the user's answers, then post the follow-up question as a
	 * second finished synthetic run and return its id. Free text in an answer returns the answers
	 * as `firstMessage` instead, for the caller to start the first turn with: only the agent can
	 * tell a tool name from a task or a wish to stop. Returns `undefined` when `requestId` is not
	 * that card (the HITL path owns it then, and answers a consumed request with 404 like for any
	 * card).
	 */
	async answerCard(
		userId: string,
		requestId: string,
		request: InstanceAiConfirmRequest,
	): Promise<
		{ threadId: string; runId: string } | { threadId: string; firstMessage: string } | undefined
	> {
		if (!requestId.startsWith(CARD_REQUEST_ID_PREFIX)) return undefined;
		const row = await this.pendingConfirmationRepo.claim(requestId, userId);
		if (!row?.toolCallId) return undefined;

		const metadata = await this.memoryService.getThreadMetadata(userId, row.threadId);
		const { questions, shown, answered } = applySurvey(
			ONBOARDING_OPENING.questions,
			surveyOf(metadata?.sourceContext),
		);
		const given = request.kind === 'questions' ? request.answers : [];
		// One answer per shown step in card order, with the question text like the `ask-user` tool adds.
		const answerFor = (question: Question): Answer => ({
			...(given.find((answer) => answer.questionId === question.id) ?? {
				questionId: question.id,
				selectedOptions: [],
				skipped: true,
			}),
			question: question.question,
		});
		const answers = shown.map(answerFor);
		// Same result shape as the `ask-user` tool, so the UI and the agent read it the same way.
		this.eventBus.publish(row.threadId, {
			type: 'tool-result',
			runId: row.runId,
			agentId: orchestratorAgentId(row.runId),
			payload: { toolCallId: row.toolCallId, result: { answered: true, answers } },
		});
		// Committed before the follow-up writes its rows, so the fold keeps the card under the
		// greeting.
		await this.eventLog.flush(row.threadId);
		// A survey answer counts as a pick, so the funnel reads the same from both entry points.
		const picked = (id: string) => {
			const fromSurvey = answered.get(id);
			if (fromSurvey) return [fromSurvey];
			return given.find((answer) => answer.questionId === id)?.selectedOptions ?? [];
		};
		this.telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_ANSWERED_AI_ASSISTANT_ONBOARDING_CARD, {
			user_id: userId,
			thread_id: row.threadId,
			team: picked('team')[0] ?? null,
			apps: picked('apps'),
			custom_text:
				given
					.map((answer) => answer.customText?.trim())
					.filter(Boolean)
					.join('\n') || null,
		});
		// The card showed only what the survey left open; the agent gets every line, in opening order.
		const lines = questions.map((question) => {
			const fromSurvey = answered.get(question.id);
			return fromSurvey
				? { question: question.question, selectedOptions: [fromSurvey] }
				: answerFor(question);
		});
		const answerMessage = buildOnboardingAnswerMessage(lines);
		// Free text is the user's own words: a tool the list lacks, a task, or a wish to stop. The
		// caller starts the first turn with the answers, and the host posts no follow-up.
		if (given.some((answer) => answer.customText?.trim())) {
			return { threadId: row.threadId, firstMessage: answerMessage };
		}
		// The LLM history reads the answers as the hidden user turn under the follow-up, so the
		// task the user types next is a normal first turn.
		const apps = answers.find((answer) => answer.questionId === 'apps')?.selectedOptions ?? [];
		const followUp = ONBOARDING_OPENING.followUp.replace('{{apps}}', mentionApps(apps));
		const { userMessageId } = await this.memoryService.seedOpeningMessages(
			row.threadId,
			userId,
			followUp,
			answerMessage,
		);
		const runId = await this.seedTurn({
			threadId: row.threadId,
			userId,
			messageId: userMessageId,
			text: followUp,
		});
		return { threadId: row.threadId, runId };
	}

	/**
	 * Store a host-written assistant turn as a finished synthetic run. With `card`, the run also
	 * holds an `ask-user` call that still waits for an answer, plus the pending row `answerCard`
	 * claims. Returns the run id.
	 */
	private async seedTurn(turn: {
		threadId: string;
		userId: string;
		messageId: string;
		text: string;
		card?: { title: string; questions: Question[] };
	}): Promise<string> {
		const { threadId, card } = turn;
		const runId = randomUUID();
		// Own group like a real run: history dedupes assistant rows by group inside one visible turn,
		// and the hidden `(continue)` rows open no turn, so a groupless greeting collapses into the
		// first real turn after a reload.
		const messageGroupId = `mg_${nanoid()}`;
		const agentId = orchestratorAgentId(runId);
		const events: InstanceAiEvent[] = [
			{
				type: 'run-start',
				runId,
				agentId,
				payload: { messageId: turn.messageId, messageGroupId },
			},
			// A delta, not a block: the log persists blocks but streams only deltas, and the
			// follow-up must show while the confirm request is still in flight.
			{ type: 'text-delta', runId, agentId, responseId: nanoid(), payload: { text: turn.text } },
		];
		const toolCallId = nanoid();
		const requestId = `${CARD_REQUEST_ID_PREFIX}${nanoid()}`;
		if (card) {
			const args = { questions: card.questions };
			events.push(
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
						questions: card.questions,
					},
				},
			);
		}
		// Finished, so the interrupted-run sweeper leaves it alone. A completed run keeps an
		// unanswered card actionable (shared reducer, `run-finish`).
		events.push({ type: 'run-finish', runId, agentId, payload: { status: 'completed' } });
		for (const event of events) this.eventBus.publish(threadId, event);
		if (card) {
			// No expiry: nothing could revive the card after a timeout.
			// ponytail: kind 'inline' (no checkpoint) because the column CHECK allows only 'inline' and
			// 'suspended'; a 'seeded' kind needs a migration. The prefix above is the real marker.
			await this.pendingConfirmationRepo.save(
				this.pendingConfirmationRepo.create({
					requestId,
					threadId,
					userId: turn.userId,
					kind: 'inline',
					runId,
					messageGroupId,
					toolCallId,
					expiresAt: null,
				}),
			);
		}
		// The client reads the messages right after the response; the fold reads committed rows.
		await this.eventLog.flush(threadId);
		return runId;
	}
}
