import { generateText } from 'ai';
import { createModel, type ModelConfig } from '@n8n/agents';

export const DEFAULT_OBSERVER_THRESHOLD_TOKENS = 8_000;
export const DEFAULT_OBSERVATION_LOG_TAIL_LIMIT = 20;

export const DEFAULT_OBSERVER_PROMPT = `You are observing a conversation between a user and an agent. Extract durable observations about what happened, what was decided, what changed, and what needs follow-up. The agent will read your observations on later turns as its memory of this conversation.

You receive: the current observation log tail, the new transcript delta since the last observation, and the current timestamp.

Output format:

Each observation is one bullet, starting with a marker, then a timestamp in (HH:MM), then the observation text.

Markers:
🔴 Critical. Facts, decisions, identities, commitments. Things the agent must not forget. User-stated identity, project context, hard constraints, explicit decisions.
🟡 Important. Preferences, ongoing work, recent activity, intermediate state. Useful for continuity but droppable under context pressure.
🟢 Info. Small acknowledgments, recoverable detail, conversational filler that has some context value. First to drop when the log is oversized.
✅ Completion. A task, question, or subtask was resolved. Use as a sub-bullet under the related observation when possible, or standalone when closing out a broader task.

Rules:
- Distinguish user assertions from questions.
- Distinguish questions from statements of intent.
- State changes supersede previous state; write the new state with the change made explicit.
- Preserve identifiers, counts, and unusual phrasing verbatim.
- Use precise action verbs.
- Use ✅ only when the user explicitly confirms something worked, a multi-step task reached its goal, or a concrete subtask became complete.
- Skip observations that are not durable: off-topic small talk, unsupported agent claims, recalled memory output the user did not react to, and speculative content phrased as fact.
- Conservatism: return no output when nothing durable happened in the delta.

Output the new observations only. Do not repeat the existing log. Do not add preamble or commentary. If there are no new observations, output nothing.`;

export interface CreateN8nObservationLogObserveFnOptions {
	observerPrompt?: string;
}

export interface N8nObservationLogObserverInput {
	scopeKind: 'thread' | 'resource';
	scopeId: string;
	now: Date;
	deltaMessages: unknown[];
	transcript: string;
	transcriptTokenCount: number;
	observationLogTail: unknown[];
	renderedObservationLogTail: string | null;
}

export type N8nObservationLogObserveFn = (input: N8nObservationLogObserverInput) => Promise<string>;

export function buildN8nObservationLogObserverPrompt(
	input: N8nObservationLogObserverInput,
): string {
	const renderedLogTail = input.renderedObservationLogTail?.trim() || '(empty)';
	const transcript = input.transcript.trim() || '(empty)';

	return [
		`Current timestamp: ${input.now.toISOString()}`,
		`Scope: ${input.scopeKind}:${input.scopeId}`,
		`Unobserved transcript tokens: ${input.transcriptTokenCount}`,
		`Current observation log tail:\n${renderedLogTail}`,
		`New transcript delta since the last observation:\n${transcript}`,
	].join('\n\n');
}

export function createN8nObservationLogObserveFn(
	model: ModelConfig,
	options: CreateN8nObservationLogObserveFnOptions = {},
): N8nObservationLogObserveFn {
	return async (input) => {
		const { text } = await generateText({
			model: createModel(model),
			system: options.observerPrompt ?? DEFAULT_OBSERVER_PROMPT,
			prompt: buildN8nObservationLogObserverPrompt(input),
		});

		return text.trim();
	};
}
