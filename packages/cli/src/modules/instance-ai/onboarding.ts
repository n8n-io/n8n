import type {
	InstanceAiConfirmRequest,
	InstanceAiOnboardingRoute,
	InstanceAiEnsureThreadResponse,
	InstanceAiEvent,
	InstanceAiQuestion,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ASK_USER_TOOL_ID, orchestratorAgentId } from '@n8n/instance-ai';
import { redactTelemetryText, TELEMETRY_EVENT } from '@n8n/telemetry';
import { nanoid } from 'nanoid';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { BadRequestError } from '@n8n/errors';
import { Telemetry } from '@/telemetry';

import { DurableEventLog } from './event-bus/durable-event-log';
import { InProcessEventBus } from './event-bus/in-process-event-bus';
import {
	InstanceAiMemoryService,
	type InstanceAiThreadLaunchMetadata,
} from './instance-ai-memory.service';
import { buildOnboardingAnswerMessage } from './internal-messages';
import { BUILD_OPTIONS, INTENT_OPTIONS, ONBOARDING_OPENING } from './onboarding-opening';
import { InstanceAiPendingConfirmationRepository } from './repositories/instance-ai-pending-confirmation.repository';

/**
 * Marks a host-seeded card's confirmation request so the confirm endpoint can tell it from a card
 * that has a run behind it. The id names the card as `onboarding-<card>~<nanoid>`, so the endpoint
 * knows the card before it claims the row. The `~` ends the card name: nanoid never uses it.
 */
const CARD_REQUEST_ID_PREFIX = 'onboarding-';
/** Length of the `requestId` column. */
const REQUEST_ID_LENGTH = 36;
const CARDS = ['intent', 'build', 'idea'] as const;
type Card = (typeof CARDS)[number];
type Question = InstanceAiQuestion;
type GivenAnswer = Extract<InstanceAiConfirmRequest, { kind: 'questions' }>['answers'][number];
/** One answer in the `workflow_builder_ask_user` result shape: the wire answer plus the question text. */
type Answer = GivenAnswer & { question: string };
type CardResult =
	| { threadId: string; runId: string; navigateTo?: 'new-workflow' }
	| { threadId: string; firstMessage: string }
	| undefined;

/**
 * The n8n Cloud signup survey answers the launch context may carry under `survey`, keyed like
 * the cloud stores them in the account `information` (`GET /rest/cloud/proxy/user/me`). Other
 * keys are dropped. The card skips a step the survey answers; the answer still reaches the agent.
 */
const surveySchema = z.object({ what_team_are_you_on: z.string().max(100).optional() });
type Survey = z.infer<typeof surveySchema>;
/** Where the survey came from: the n8n Cloud account, or the `?team=` query of a test run. */
const surveySourceSchema = z.enum(['cloud', 'url']);
type SurveySource = z.infer<typeof surveySourceSchema> | null;
const launchContextSchema = z.object({
	survey: surveySchema.optional(),
	surveySource: surveySourceSchema.optional(),
});
/** Card question id -> the survey key that answers it. */
// ponytail: one pair; move it into the opening when a second survey-backed question shows up.
const SURVEY_KEY_BY_QUESTION: Partial<Record<string, keyof Survey>> = {
	team: 'what_team_are_you_on',
};

/** True when the answer holds free text: the card answer then starts the first model turn. */
function hasFreeText(request: InstanceAiConfirmRequest): boolean {
	return (
		request.kind === 'questions' && request.answers.some((answer) => answer.customText?.trim())
	);
}

function requestIdFor(card: Card): string {
	const prefix = `${CARD_REQUEST_ID_PREFIX}${card}~`;
	return `${prefix}${nanoid(REQUEST_ID_LENGTH - prefix.length)}`;
}

function cardOf(requestId: string): Card | undefined {
	return CARDS.find((card) => requestId.startsWith(`${CARD_REQUEST_ID_PREFIX}${card}~`));
}

/** True when `requestId` is an onboarding card and answering it with `request` starts a model run. */
export function startsOnboardingFirstTurn(
	requestId: string,
	request: InstanceAiConfirmRequest,
): boolean {
	const card = cardOf(requestId);
	if (!card || request.kind !== 'questions') return false;
	return hasFreeText(request) || card === 'idea';
}

/**
 * Whether the first real turn of an onboarding thread preloads the suggest-automations skill. Only
 * the idea route does. The build routes and free text in the intent card start a normal turn.
 */
export function preloadsSuggestAutomations(metadata: Record<string, unknown> | undefined): boolean {
	return metadata?.onboardingRoute === 'idea';
}

function surveyOf(sourceContext: unknown): { survey: Survey; surveySource: SurveySource } {
	const parsed = launchContextSchema.safeParse(sourceContext ?? {});
	if (!parsed.success) throw new BadRequestError('Invalid onboarding survey in sourceContext');
	return { survey: parsed.data.survey ?? {}, surveySource: parsed.data.surveySource ?? null };
}

/** The steps of a card, before the survey removes the ones it answers. */
function questionsOf(card: Card): Question[] {
	switch (card) {
		case 'intent':
			return [ONBOARDING_OPENING.intent];
		case 'build':
			return [ONBOARDING_OPENING.build.question];
		case 'idea':
			return ONBOARDING_OPENING.idea.questions;
	}
}

/** The route a pick on the intent or build card leads to. A pick is "title\ndescription". */
function routeOf(card: 'intent' | 'build', option: string | undefined): InstanceAiOnboardingRoute {
	const pick = option?.split('\n')[0];
	if (card === 'intent') {
		if (pick === INTENT_OPTIONS.build) return 'build';
		if (pick === INTENT_OPTIONS.idea) return 'idea';
		return 'other';
	}
	return pick === BUILD_OPTIONS.canvas ? 'build_canvas' : 'build_ai';
}

/**
 * Split the card into the steps it shows and the answers the survey already gave. A shown step
 * that picks its options from a survey-answered step gets them resolved here: the card resolves
 * `optionsByAnswer` only from its own steps. `{{team}}` in a question text becomes the survey's
 * team. A value outside the step's options (the survey's "Other") names no team: texts drop it
 * and dependents keep their fallback options.
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

/**
 * The agent-first onboarding thread. n8n Cloud sends a new signup in the variant arm of the
 * `137_instance_ai_chat_onboarding_v2` experiment to `/assistant?source=onboarding`; the Cloud
 * backend evaluates the flag, so the instance never reads it.
 *
 * The greeting and the intent card are stored before the agent's first turn, the card as a
 * finished synthetic run whose `workflow_builder_ask_user` call still waits for an answer. The UI
 * shows, answers and restores the card through the same HITL path as a live one. Each answer
 * settles its card and posts the route's next card or text the same way, with no model turn: build
 * asks how to build, idea asks for team, apps and a goal and then starts the first turn.
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
		const { survey, surveySource } = surveyOf(launchMetadata.sourceContext);
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
		try {
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
				card: { card: 'intent', questions: [ONBOARDING_OPENING.intent] },
			});
		} catch (error) {
			// A thread without its greeting and card would open empty and never get them: remove it,
			// so the next visit creates a whole one.
			await this.memoryService.deleteThread(threadId);
			throw error;
		}
		const team = survey.what_team_are_you_on?.trim() || null;
		this.telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_STARTED_AI_ASSISTANT_ONBOARDING, {
			user_id: user.id,
			thread_id: threadId,
			team,
			team_source: team ? surveySource : null,
		});
		return response;
	}

	/**
	 * Settle a host-seeded card with the user's answers, then post the route's next card or text as
	 * a finished synthetic run and return its id. Returns the answers as `firstMessage` instead when
	 * the answer starts the first turn (free text, the idea card), for the caller to start that turn
	 * with: only the agent can tell a task from a tool name or a wish to stop. Returns `undefined`
	 * when `requestId` is not an onboarding card (the HITL path owns it then, and answers a
	 * consumed request with 404 like for any card).
	 */
	async answerCard(
		userId: string,
		requestId: string,
		request: InstanceAiConfirmRequest,
	): Promise<CardResult> {
		const card = cardOf(requestId);
		if (!card) return undefined;
		// Before the claim: a refused request must leave the card open.
		if (request.kind !== 'questions') {
			throw new BadRequestError('The onboarding card takes answers of kind "questions"');
		}
		const row = await this.pendingConfirmationRepo.claim(requestId, userId);
		if (!row?.toolCallId) return undefined;

		const metadata = await this.memoryService.getThreadMetadata(userId, row.threadId);
		const { survey, surveySource } = surveyOf(metadata?.sourceContext);
		const { questions, shown, answered } = applySurvey(questionsOf(card), survey);
		const given = request.answers;
		// One answer per shown step in card order, with the question text like the `workflow_builder_ask_user` tool adds.
		// An option is "title\ndescription"; the answer keeps the title only, for the record and the
		// agent alike.
		const answerFor = (question: Question): Answer => {
			const answer = given.find((entry) => entry.questionId === question.id) ?? {
				questionId: question.id,
				selectedOptions: [],
				skipped: true,
			};
			return {
				...answer,
				selectedOptions: answer.selectedOptions.map((option) => option.split('\n')[0]),
				question: question.question,
			};
		};
		const answers = shown.map(answerFor);
		// Same result shape as the `workflow_builder_ask_user` tool, so the UI and the agent read it the same way.
		this.eventBus.publish(row.threadId, {
			type: 'tool-result',
			runId: row.runId,
			agentId: orchestratorAgentId(row.runId),
			payload: { toolCallId: row.toolCallId, result: { answered: true, answers } },
		});
		// Committed before the next card writes its rows, so the fold keeps the card in place.
		await this.eventLog.flush(row.threadId);
		const freeText = hasFreeText(request);
		const customText =
			redactTelemetryText(
				given
					.map((answer) => answer.customText?.trim())
					.filter(Boolean)
					.join('\n'),
			) || null;
		// The card showed only what the survey left open; the agent gets every line, in card order.
		const lines = questions.map((question) => {
			const fromSurvey = answered.get(question.id);
			return fromSurvey
				? { question: question.question, selectedOptions: [fromSurvey] }
				: answerFor(question);
		});
		const answerMessage = buildOnboardingAnswerMessage(lines);
		const thread = { threadId: row.threadId, userId };

		if (card === 'intent' || card === 'build') {
			// Free text in the build card is the task to build; in the intent card it leaves the routing.
			const route =
				freeText && card === 'intent' ? 'other' : routeOf(card, answers[0]?.selectedOptions[0]);
			this.telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_PICKED_AI_ASSISTANT_ONBOARDING_OPTION, {
				user_id: userId,
				thread_id: row.threadId,
				card,
				route,
				custom_text: customText,
			});
			return await this.followRoute(thread, route, survey, answerMessage, freeText);
		}

		// A survey answer counts as a pick, so the funnel reads the same from both entry points.
		const picked = (id: string) => {
			const fromSurvey = answered.get(id);
			if (fromSurvey) return [fromSurvey];
			return given.find((answer) => answer.questionId === id)?.selectedOptions ?? [];
		};
		const team = picked('team')[0] ?? null;
		// The survey answered the team step, or the card did, or the user skipped it.
		const teamSource = answered.has('team') ? surveySource : team ? 'card' : null;
		this.telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_ANSWERED_AI_ASSISTANT_ONBOARDING_CARD, {
			user_id: userId,
			thread_id: row.threadId,
			team,
			team_source: teamSource,
			apps: picked('apps'),
			goal: picked('goal')[0] ?? null,
			custom_text: customText,
		});
		return { threadId: row.threadId, firstMessage: answerMessage };
	}

	/**
	 * Store the route, then post its next step. The route decides which skill the first turn
	 * preloads. The canvas route ends the onboarding and sends the user to a blank canvas.
	 */
	private async followRoute(
		thread: { threadId: string; userId: string },
		route: InstanceAiOnboardingRoute,
		survey: Survey,
		answerMessage: string,
		freeText: boolean,
	): Promise<CardResult> {
		// ponytail: the card is already settled here. If this write or the next seed fails, the thread
		// keeps an answered card and no next step (as in P0); a new onboarding thread recovers.
		await this.memoryService.updateThread(thread.threadId, {
			metadata: {
				onboardingRoute: route,
				...(route === 'build_canvas' ? { onboardingLeft: true } : {}),
			},
		});
		// Free text in a routing card is the user's first message: a task, or something else.
		if (freeText || route === 'other') {
			return { threadId: thread.threadId, firstMessage: answerMessage };
		}
		const { build, idea } = ONBOARDING_OPENING;
		switch (route) {
			case 'build':
				return await this.seedNext(thread, build.lead, answerMessage, {
					card: 'build',
					questions: [build.question],
				});
			case 'idea':
				return await this.seedNext(thread, idea.lead, answerMessage, {
					card: 'idea',
					questions: applySurvey(idea.questions, survey).shown,
				});
			case 'build_ai':
				return await this.seedNext(thread, build.aiFollowUp, answerMessage);
			case 'build_canvas':
				// The client opens a blank canvas in the same tab; the message stays in the thread.
				return {
					...(await this.seedNext(thread, build.canvasMessage, answerMessage)),
					navigateTo: 'new-workflow',
				};
		}
	}

	/**
	 * Post an assistant text, and optionally the next card, under the answers of the card before.
	 * The answers ride the hidden user turn, so the model reads every card when its turn starts.
	 */
	private async seedNext(
		thread: { threadId: string; userId: string },
		text: string,
		answerMessage: string,
		card?: { card: Card; questions: Question[] },
	): Promise<{ threadId: string; runId: string }> {
		const { userMessageId } = await this.memoryService.seedOpeningMessages(
			thread.threadId,
			thread.userId,
			text,
			answerMessage,
		);
		const runId = await this.seedTurn({ ...thread, messageId: userMessageId, text, card });
		return { threadId: thread.threadId, runId };
	}

	/**
	 * Store a host-written assistant turn as a finished synthetic run. With `card`, the run also
	 * holds a `workflow_builder_ask_user` call that still waits for an answer, plus the pending row
	 * `answerCard` claims. Returns the run id.
	 */
	private async seedTurn(turn: {
		threadId: string;
		userId: string;
		messageId: string;
		text: string;
		card?: { card: Card; questions: Question[] };
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
				// Marks the run as host-written, so the client paces it like a step, not a reply.
				payload: { messageId: turn.messageId, messageGroupId, hostSeeded: true },
			},
			// A delta, not a block: the log persists blocks but streams only deltas, and the
			// next card must show while the confirm request is still in flight.
			{ type: 'text-delta', runId, agentId, responseId: nanoid(), payload: { text: turn.text } },
		];
		const toolCallId = nanoid();
		const requestId = card && requestIdFor(card.card);
		if (card && requestId) {
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
						message: ONBOARDING_OPENING.title,
						inputType: 'questions',
						questions: card.questions,
					},
				},
			);
		}
		// Finished, so the interrupted-run sweeper leaves it alone. A completed run keeps an
		// unanswered card actionable (shared reducer, `run-finish`).
		events.push({ type: 'run-finish', runId, agentId, payload: { status: 'completed' } });
		if (requestId) {
			// Saved before the events go out: a client that answers the card as soon as it shows
			// must find the row. No expiry: nothing could revive the card after a timeout.
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
		for (const event of events) this.eventBus.publish(threadId, event);
		// The client reads the messages right after the response; the fold reads committed rows.
		await this.eventLog.flush(threadId);
		return runId;
	}
}
