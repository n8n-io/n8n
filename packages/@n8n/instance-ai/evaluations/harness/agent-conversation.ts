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

/** One thread the simulated user drives toward `goal`. `opening`: who writes the
 *  thread's first message — the seed (generated from the data setup, as a
 *  single-shot run does) or the simulated user, from the goal. */
export interface AgentSessionPlan {
	goal: string;
	maxTurns: number;
	opening: 'seed' | 'user';
}

export interface AgentConversationTurn {
	userMessage: string;
	result: InstanceAiEvalAgentExecutionResult;
	/** Sent as the scenario's last request (`final`), so the server dropped the world. */
	final?: boolean;
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
		return scenario.sessions.map(({ goal, maxTurns }) => ({ goal, maxTurns, opening: 'user' }));
	}
	if (scenario.userTurns) {
		const { goal, maxTurns } = scenario.userTurns;
		return [{ goal, maxTurns, opening: 'seed' }];
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
 * A `userTurns` thread opens with the seed's message; every session of a
 * `sessions` scenario with the simulated user's own opening for its goal. A
 * failed turn ends the conversation.
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
		const last = index === input.plans.length - 1;
		const session = await runSession(plan, last, sessions, context);
		sessions.push(session);
		if (session.turns.some((turn) => !turn.result.success)) break;
	}
	await releaseWorld(sessions, context);
	return { resourceId: context.resourceId, sessions };
}

/**
 * Tell the server the scenario is over, so it drops the simulated user's world,
 * unless the last turn already did (it was sent `final` and succeeded). Best
 * effort: the server drops idle worlds on its own.
 */
async function releaseWorld(
	sessions: AgentConversationSession[],
	context: ConversationContext,
): Promise<void> {
	const session = sessions.filter((s) => s.turns.length > 0).at(-1);
	const lastTurn = session?.turns.at(-1);
	if (!session || !lastTurn || (lastTurn.final && lastTurn.result.success)) return;
	try {
		await context.executeTurn({
			threadId: session.threadId,
			resourceId: context.resourceId,
			expectedTurn: session.turns.length + 1,
			final: true,
		});
	} catch {
		// The server forgets the world after its idle TTL anyway.
	}
}

async function runSession(
	plan: AgentSessionPlan,
	last: boolean,
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
	const fromUser = plan.opening === 'user';
	let message = fromUser ? await nextMessage() : undefined;
	if (fromUser && message === undefined) return session;
	while (session.turns.length < plan.maxTurns) {
		const expectedTurn = session.turns.length + 1;
		const final = last && expectedTurn === plan.maxTurns;
		const turn = await runTurn(
			{ threadId: session.threadId, expectedTurn, message, final },
			context,
		);
		session.turns.push(turn);
		if (!turn.result.success || session.turns.length >= plan.maxTurns) break;
		message = await nextMessage();
		if (message === undefined) break;
	}
	return session;
}

async function runTurn(
	request: { threadId: string; expectedTurn: number; message?: string; final: boolean },
	context: ConversationContext,
): Promise<AgentConversationTurn> {
	const { threadId, expectedTurn, message, final } = request;
	const result = await context.executeTurn({
		threadId,
		resourceId: context.resourceId,
		expectedTurn,
		...(message !== undefined ? { message } : {}),
		...(final ? { final } : {}),
	});
	throwIfTurnOutOfStep(result, expectedTurn);
	const userMessage = result.thread?.userMessage ?? message ?? result.seed.openingMessage;
	return { userMessage, result, ...(final ? { final } : {}) };
}

/**
 * The server must report the turn the harness sent. Anything else (a refused,
 * unknown, or expired thread) means the Agent did not see the conversation the
 * harness thinks it did, so the run is not graded.
 */
function throwIfTurnOutOfStep(
	result: InstanceAiEvalAgentExecutionResult,
	expectedTurn: number,
): void {
	const turn = result.thread?.turn;
	if (turn === expectedTurn) return;
	const errors = result.errors.length > 0 ? ` (${result.errors.join('; ')})` : '';
	throw new Error(
		`FRAMEWORK ISSUE: eval thread out of step — expected turn ${String(expectedTurn)}, got ${turn === undefined ? 'none' : String(turn)}${errors}`,
	);
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

/** User messages sent across every session. */
export function conversationTurnCount(conversation: AgentConversation): number {
	return conversation.sessions.reduce((count, session) => count + session.turns.length, 0);
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
	if (!first || !last) {
		throw new Error(
			'FRAMEWORK ISSUE: the Agent conversation ran no turns — the simulated user wrote no opening message',
		);
	}
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
