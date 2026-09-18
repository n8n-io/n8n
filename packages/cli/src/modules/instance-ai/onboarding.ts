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
	loadInstanceAiRuntimeSkillSource,
	orchestratorAgentId,
} from '@n8n/instance-ai';
import { UnexpectedError } from 'n8n-workflow';
import { nanoid } from 'nanoid';
import { randomUUID } from 'node:crypto';
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
export const ONBOARDING_SKILL_ID = 'probe-user';

/**
 * Marks the opener's confirmation request so the confirm endpoint can tell it from a card that
 * has a run behind it. Fits the 36-char `requestId` column together with a nanoid.
 */
const OPENING_REQUEST_ID_PREFIX = 'onboarding-';
/** Start of the `${N8N_*}` placeholders the sandbox materializer substitutes; split so the lint rule for interpolation does not fire. */
const PRELOAD_FORBIDDEN_PLACEHOLDER_PREFIX = '$' + '{N8N_';

/** `metadata.opening` in the skill frontmatter: the copy shown before the agent's first turn. */
const openingSchema = z.object({
	title: z.string().min(1),
	greeting: z.string().min(1),
	questions: z.array(instanceAiQuestionSchema).min(1),
});

interface OnboardingSkill {
	/** SKILL.md body, preloaded on the opening turn. */
	instructions: string;
	opening: z.infer<typeof openingSchema>;
}

/**
 * The body goes to the model as is. The sandbox materializer substitutes `${N8N_*}` placeholders
 * only in the skills it writes to the workspace, so a placeholder here would reach the shell as
 * an unset variable. Fail here, at thread creation, instead of in the agent's first command.
 */
export async function loadOnboardingSkill(): Promise<OnboardingSkill> {
	const skill = await loadInstanceAiRuntimeSkillSource().loadSkill(ONBOARDING_SKILL_ID);
	if (!skill) throw new UnexpectedError(`Runtime skill "${ONBOARDING_SKILL_ID}" not found`);
	if (skill.instructions.includes(PRELOAD_FORBIDDEN_PLACEHOLDER_PREFIX)) {
		throw new UnexpectedError(
			`Runtime skill "${ONBOARDING_SKILL_ID}" is preloaded and must not use \${N8N_*} placeholders`,
		);
	}
	return {
		instructions: skill.instructions,
		opening: openingSchema.parse(skill.metadata?.opening),
	};
}

/**
 * The agent-first onboarding thread. The greeting and the first question are stored when the
 * thread is created, as a finished synthetic run whose `ask-user` call still waits for an
 * answer. The UI shows, answers and restores that card through the same HITL path as a live
 * one; the answer settles the call and starts the first real turn.
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

		const runId = randomUUID();
		const agentId = orchestratorAgentId(runId);
		const toolCallId = nanoid();
		const requestId = `${OPENING_REQUEST_ID_PREFIX}${nanoid()}`;
		const args = { questions: opening.questions };
		const events: InstanceAiEvent[] = [
			{
				type: 'run-start',
				runId,
				agentId,
				payload: { messageId: userMessageId, messageGroupId: nanoid() },
			},
			{ type: 'text-block', runId, agentId, payload: { text: greeting } },
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
					message: opening.questions[0].question,
					inputType: 'questions',
					questions: opening.questions,
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
				userId: user.id,
				kind: 'inline',
				runId,
				toolCallId,
				expiresAt: null,
			}),
		);
		// The client loads the messages right after this response; the fold reads committed rows.
		await this.eventLog.flush(threadId);
		return response;
	}

	/**
	 * Settle the opening card with the user's answer. Returns the turn that carries the answer
	 * to the agent, or `undefined` when `requestId` is not an opening card (the HITL path owns
	 * it then, and answers a consumed request with 404 like for any card).
	 */
	async answerOpeningCard(
		userId: string,
		requestId: string,
		request: InstanceAiConfirmRequest,
	): Promise<{ threadId: string; message: string } | undefined> {
		if (!requestId.startsWith(OPENING_REQUEST_ID_PREFIX)) return undefined;
		const row = await this.pendingConfirmationRepo.claim(requestId, userId);
		if (!row?.toolCallId) return undefined;

		const { opening } = await loadOnboardingSkill();
		// Same result shape as the `ask-user` tool, so the UI and the agent read it the same way.
		const result =
			request.kind === 'questions'
				? {
						answered: true,
						answers: request.answers.map((answer) => ({
							...answer,
							question:
								opening.questions.find((q) => q.id === answer.questionId)?.question ??
								answer.questionId,
						})),
					}
				: { answered: false };
		this.eventBus.publish(row.threadId, {
			type: 'tool-result',
			runId: row.runId,
			agentId: orchestratorAgentId(row.runId),
			payload: { toolCallId: row.toolCallId, result },
		});
		// Committed before the first turn writes its rows, so the fold keeps pairing the card
		// with the greeting.
		await this.eventLog.flush(row.threadId);
		return {
			threadId: row.threadId,
			message: buildOnboardingAnswerMessage(result),
		};
	}
}
