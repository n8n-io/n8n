// ---------------------------------------------------------------------------
// Multi-turn Agent runs (AGENT-1666). A scenario with `userTurns` or
// `sessions` talks to the Agent through a simulated user, one eval thread
// per session, all for the same simulated user (resource id). The server
// keeps each thread (agent-execution.service.ts, `thread`).
//
// Resource id rule: one plain id per scenario run (`eval-user-<uuid>`). Plain,
// because an integration-style id turns episodic memory off. Fresh per run, so
// memory cannot leak between cases, scenarios, or iterations. Reused by every
// session of the run, so a later session is the same user.
// ---------------------------------------------------------------------------

import type {
	InstanceAiEvalAgentExecutionResult,
	InstanceAiEvalAgentThreadTurn,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { randomUUID } from 'node:crypto';

import type { ExecutionScenario, TranscriptStep, TranscriptTurn } from '../types';
import type { AgentUserProxy, AgentUserTurn } from '../utils/user-proxy/agent-user';

/** One thread the simulated user drives toward `goal`. */
export interface AgentSessionPlan {
	goal: string;
	maxTurns: number;
}

export interface AgentConversationTurn {
	userMessage: string;
	result: InstanceAiEvalAgentExecutionResult;
}

export interface AgentConversationSession {
	threadId: string;
	goal: string;
	turns: AgentConversationTurn[];
}

export interface AgentConversation {
	resourceId: string;
	sessions: AgentConversationSession[];
}

export type ExecuteAgentTurn = (
	thread: InstanceAiEvalAgentThreadTurn,
) => Promise<InstanceAiEvalAgentExecutionResult>;

/** The sessions a scenario runs, or undefined for a single-shot scenario. */
export function agentSessionPlans(scenario: ExecutionScenario): AgentSessionPlan[] | undefined {
	if (scenario.sessions) {
		return scenario.sessions.map(({ goal, maxTurns }) => ({ goal, maxTurns }));
	}
	if (scenario.userTurns) {
		return [{ goal: scenario.userTurns.goal, maxTurns: scenario.userTurns.maxTurns }];
	}
	return undefined;
}

export function newEvalResourceId(): string {
	return `eval-user-${randomUUID()}`;
}

interface ConversationContext {
	resourceId: string;
	dataSetup: string;
	user: AgentUserProxy;
	executeTurn: ExecuteAgentTurn;
}

/**
 * Run every session in order, each in a new thread for the same resource id.
 * The first session opens with the seed's message (generated from the data
 * setup, as a single-shot run does); a later one with the simulated user's own
 * opening. A failed turn ends the conversation.
 */
export async function runAgentConversation(input: {
	plans: AgentSessionPlan[];
	dataSetup: string;
	user: AgentUserProxy;
	executeTurn: ExecuteAgentTurn;
}): Promise<AgentConversation> {
	const context: ConversationContext = { ...input, resourceId: newEvalResourceId() };
	const sessions: AgentConversationSession[] = [];
	for (const [index, plan] of input.plans.entries()) {
		const session = await runSession(plan, index === 0, sessions, context);
		sessions.push(session);
		if (session.turns.some((turn) => !turn.result.success)) break;
	}
	return { resourceId: context.resourceId, sessions };
}

async function runSession(
	plan: AgentSessionPlan,
	first: boolean,
	earlier: AgentConversationSession[],
	context: ConversationContext,
): Promise<AgentConversationSession> {
	const session: AgentConversationSession = { threadId: randomUUID(), goal: plan.goal, turns: [] };
	const nextMessage = async () =>
		await context.user.nextMessage({
			goal: plan.goal,
			dataSetup: context.dataSetup,
			transcript: userTurnsOf(session.turns),
			earlierSessions: earlier.map((done) => userTurnsOf(done.turns)),
		});
	let message = first ? undefined : await nextMessage();
	if (!first && message === undefined) return session;
	while (session.turns.length < plan.maxTurns) {
		const turn = await runTurn(session.threadId, message, context);
		session.turns.push(turn);
		if (!turn.result.success || session.turns.length >= plan.maxTurns) break;
		message = await nextMessage();
		if (message === undefined) break;
	}
	return session;
}

async function runTurn(
	threadId: string,
	message: string | undefined,
	context: ConversationContext,
): Promise<AgentConversationTurn> {
	const result = await context.executeTurn({
		threadId,
		resourceId: context.resourceId,
		...(message !== undefined ? { message } : {}),
	});
	const userMessage = result.thread?.userMessage ?? message ?? result.seed.openingMessage;
	return { userMessage, result };
}

function userTurnsOf(turns: AgentConversationTurn[]): AgentUserTurn[] {
	return turns.flatMap(({ userMessage, result }): AgentUserTurn[] => [
		{ role: 'user', text: userMessage },
		...(result.finalText ? [{ role: 'assistant' as const, text: result.finalText }] : []),
	]);
}

function sumOptional(values: Array<number | undefined>): number | undefined {
	const present = values.filter((value): value is number => value !== undefined);
	return present.length > 0 ? present.reduce((sum, value) => sum + value, 0) : undefined;
}

/**
 * One result for the whole conversation, in the single-shot shape the reports
 * and artifacts read: every turn's tool calls, model turns, errors, and usage,
 * the last turn's reply, and success only when every turn succeeded.
 */
export function mergeConversationResult(
	conversation: AgentConversation,
): InstanceAiEvalAgentExecutionResult {
	const results = conversation.sessions.flatMap((session) => session.turns.map((t) => t.result));
	const [first] = results;
	const last = results[results.length - 1];
	if (!first || !last) throw new Error('An Agent conversation ran no turns');
	const inputTokens = sumOptional(results.map((r) => r.usage?.inputTokens));
	const outputTokens = sumOptional(results.map((r) => r.usage?.outputTokens));
	return {
		...last,
		success: results.every((r) => r.success),
		errors: results.flatMap((r) => r.errors),
		toolCalls: results.flatMap((r) => r.toolCalls),
		modelTurns: results.flatMap((r) => r.modelTurns),
		mockedCredentials: results.flatMap((r) => r.mockedCredentials),
		llmUsage: results.flatMap((r) => r.llmUsage ?? []),
		seed: first.seed,
		skippedFeatures: first.skippedFeatures,
		...(inputTokens !== undefined || outputTokens !== undefined
			? { usage: { inputTokens, outputTokens } }
			: {}),
	};
}

function stepsOf(result: InstanceAiEvalAgentExecutionResult): TranscriptStep[] {
	const toolSteps = result.toolCalls.map(
		(call): TranscriptStep => ({
			kind: 'tool-call',
			toolName: call.tool,
			...(isRecord(call.input) ? { args: call.input } : {}),
			...(call.output !== undefined ? { result: call.output } : {}),
			...(call.error ? { error: call.error } : {}),
		}),
	);
	return [...toolSteps, { kind: 'agent-text', text: result.finalText }];
}

/** The judge's transcript. Each session starts with a heading when there are several. */
export function conversationTranscript(conversation: AgentConversation): TranscriptTurn[] {
	const marked = conversation.sessions.length > 1;
	return conversation.sessions.flatMap((session, sessionIndex) =>
		session.turns.map(
			(turn, turnIndex): TranscriptTurn => ({
				...(marked && turnIndex === 0
					? {
							heading: `## Session ${String(sessionIndex + 1)} (a new chat thread, same user)`,
						}
					: {}),
				userMessage: turn.userMessage,
				steps: stepsOf(turn.result),
			}),
		),
	);
}

/** A single-shot run as a one-turn transcript. */
export function singleTurnTranscript(result: InstanceAiEvalAgentExecutionResult): TranscriptTurn[] {
	return [{ userMessage: result.seed.openingMessage, steps: stepsOf(result) }];
}
