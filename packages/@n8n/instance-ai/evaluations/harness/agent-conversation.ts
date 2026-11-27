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
	InstanceAiEvalAgentMemoryState,
	InstanceAiEvalAgentThreadTurn,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { randomUUID } from 'node:crypto';

import type { ExecutionScenario, TranscriptStep, TranscriptTurn } from '../types';
import type {
	AgentUserContext,
	AgentUserProxy,
	AgentUserReply,
	AgentUserTurn,
} from '../utils/user-proxy/agent-user';

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
	/** The scenario declares `sessions`, so the transcript marks each one, even a single one. */
	usesSessions: boolean;
}

/** An Agent run that failed after `turnCount` turns got a reply. Keeps the
 *  original message, which the pipeline classifies (FRAMEWORK ISSUE, timeouts). */
export class AgentRunError extends Error {
	constructor(
		message: string,
		readonly turnCount: number,
		options?: { cause?: unknown },
	) {
		super(message, options);
		this.name = 'AgentRunError';
	}
}

/** `error` as an AgentRunError that records `turnCount`. */
export function withTurnCount(error: unknown, turnCount: number): AgentRunError {
	if (error instanceof AgentRunError) return error;
	const message = error instanceof Error ? error.message : String(error);
	return new AgentRunError(message, turnCount, { cause: error });
}

/** `awaitMemory`: wait for the turn's background memory work before the
 *  response, because a later session of the same user follows (AGENT-1666). */
export type ExecuteAgentTurn = (
	thread: InstanceAiEvalAgentThreadTurn,
	options: { awaitMemory: boolean },
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
	awaitMemory?: boolean;
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
	try {
		for (const [index, plan] of input.plans.entries()) {
			const earlier = [...sessions];
			const session: AgentConversationSession = {
				threadId: randomUUID(),
				goal: plan.goal,
				turns: [],
			};
			sessions.push(session);
			const last = index === input.plans.length - 1;
			// Which turn ends a session is known only after the simulated user stops,
			// so every turn of a session that another session follows waits for memory.
			await runSession(plan, last, session, earlier, { ...context, awaitMemory: !last });
			if (session.turns.some((turn) => !turn.result.success)) break;
		}
	} catch (error) {
		throw withTurnCount(error, countTurns(sessions));
	}
	await releaseWorld(sessions, context);
	// Only `sessions` plans open with the simulated user's message (agentSessionPlans).
	const usesSessions = input.plans.some((plan) => plan.opening === 'user');
	return { resourceId: context.resourceId, sessions, usesSessions };
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
		await context.executeTurn(
			{
				threadId: session.threadId,
				resourceId: context.resourceId,
				expectedTurn: session.turns.length + 1,
				final: true,
			},
			{ awaitMemory: false },
		);
	} catch {
		// The server forgets the world after its idle TTL anyway.
	}
}

/**
 * The simulated user's next message, or undefined when it is done. A failed
 * simulated user is the harness's problem, not the Agent's: the run is not
 * graded.
 */
async function askUser(
	user: AgentUserProxy,
	userContext: AgentUserContext,
): Promise<string | undefined> {
	let reply: AgentUserReply;
	try {
		reply = await user.nextMessage(userContext);
	} catch (error) {
		reply = { kind: 'error', error: error instanceof Error ? error.message : String(error) };
	}
	if (reply.kind === 'error') {
		throw new Error(`FRAMEWORK ISSUE: the simulated user failed — ${reply.error}`);
	}
	return reply.kind === 'message' ? reply.message : undefined;
}

/** Run one session, adding each turn to `session` as it gets a reply. */
async function runSession(
	plan: AgentSessionPlan,
	last: boolean,
	session: AgentConversationSession,
	earlier: AgentConversationSession[],
	context: ConversationContext,
): Promise<void> {
	const nextMessage = async () =>
		await askUser(context.user, {
			goal: plan.goal,
			dataSetup: context.dataSetup,
			transcript: userTurnsOf(session.turns),
			earlierSessions: earlier.map((done) => userTurnsOf(done.turns)),
		});
	const fromUser = plan.opening === 'user';
	let message = fromUser ? await nextMessage() : undefined;
	if (fromUser && message === undefined) return;
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
}

async function runTurn(
	request: { threadId: string; expectedTurn: number; message?: string; final: boolean },
	context: ConversationContext,
): Promise<AgentConversationTurn> {
	const { threadId, expectedTurn, message, final } = request;
	const result = await context.executeTurn(
		{
			threadId,
			resourceId: context.resourceId,
			expectedTurn,
			...(message !== undefined ? { message } : {}),
			...(final ? { final } : {}),
		},
		{ awaitMemory: context.awaitMemory === true },
	);
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
	return countTurns(conversation.sessions);
}

function countTurns(sessions: AgentConversationSession[]): number {
	return sessions.reduce((count, session) => count + session.turns.length, 0);
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
	const memory = conversationMemory(results);
	const sideCallUsage = results.flatMap((r) => r.sideCallUsage ?? []);
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
		...(memory ? { memory } : {}),
		...(sideCallUsage.length > 0 ? { sideCallUsage } : {}),
	};
}

/** The memory stored after the last turn that reported it, with the memory
 *  tasks of every turn; stale when the last memory turn could not read it.
 *  Undefined when memory was off. */
function conversationMemory(
	results: InstanceAiEvalAgentExecutionResult[],
): InstanceAiEvalAgentMemoryState | undefined {
	const states = results.flatMap((r) => (r.memory ? [r.memory] : []));
	const last = states[states.length - 1];
	if (!last) return undefined;
	const lastMemoryTurn = results.filter((r) => r.memoryConfig !== undefined).at(-1);
	const stale = lastMemoryTurn !== undefined && lastMemoryTurn.memory === undefined;
	return {
		...last,
		tasks: states.flatMap((state) => state.tasks),
		...(stale ? { stale: true } : {}),
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

/** The judge's transcript. Each session of a `sessions` scenario starts with a heading. */
export function conversationTranscript(conversation: AgentConversation): TranscriptTurn[] {
	const marked = conversation.usesSessions;
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
