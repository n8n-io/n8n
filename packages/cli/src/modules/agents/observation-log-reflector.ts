import { generateText } from 'ai';
import { createModel, type ModelConfig } from '@n8n/agents';

export const DEFAULT_REFLECTOR_THRESHOLD_TOKENS = 24_000;

export const DEFAULT_REFLECTOR_PROMPT = `You are reorganizing an observation log so it stays useful and under a size limit. The log is an append-only record of what's happened in a conversation. Your job is to identify what to drop, merge, or replace, while preserving the most important content.

You receive: the current active observation log with IDs, timestamps, and markers; the current timestamp; and the token budget.

Markers and priority:
🔴 Critical. Facts, decisions, identities, commitments. Never drop. May merge with other 🔴 on the same topic if they restate the same thing.
🟡 Important. Preferences, ongoing work, recent activity. Drop only if clearly superseded or redundant. Prefer merging over dropping.
🟢 Info. Small acknowledgments, recoverable detail. First to drop when the log is oversized. Drop older 🟢 before newer.
✅ Completion. Drop if the parent observation is dropped. May be merged into the parent on consolidation.

Tiebreaker: when two observations are equally important, keep the more recent one.

Output format:

Return JSON with two arrays:

{
  "drop": ["obs_id_1", "obs_id_2"],
  "merge": [
    {
      "supersedes": ["obs_id_3", "obs_id_4"],
      "marker": "🟡",
      "text": "Merged observation that replaces the listed ones"
    }
  ]
}

The merged observation replaces the supersedes set. The drop array drops observations without replacement.

Goals:
- Keep the active log under the token budget.
- Preserve every 🔴 unless duplicated.
- Preserve recent 🟡 unless superseded.
- Drop 🟢 aggressively, especially older ones.
- Merge clusters of related observations into denser ones.
- Never invent content not present in the source observations.

If the log is already under budget, return {"drop": [], "merge": []}.`;

export interface CreateN8nObservationLogReflectFnOptions {
	reflectorPrompt?: string;
}

export interface N8nObservationLogReflectorInput {
	scopeKind: 'thread' | 'resource';
	scopeId: string;
	now: Date;
	activeObservationLog: unknown[];
	renderedObservationLog: string;
	tokenCount: number;
	tokenBudget: number;
}

export type N8nObservationLogReflectFn = (
	input: N8nObservationLogReflectorInput,
) => Promise<string>;

export function buildN8nObservationLogReflectorPrompt(
	input: N8nObservationLogReflectorInput,
): string {
	const renderedLog = input.renderedObservationLog.trim() || '(empty)';

	return [
		`Current timestamp: ${input.now.toISOString()}`,
		`Scope: ${input.scopeKind}:${input.scopeId}`,
		`Active observation log tokens: ${input.tokenCount}`,
		`Token budget: ${input.tokenBudget}`,
		`Current active observation log:\n${renderedLog}`,
	].join('\n\n');
}

export function createN8nObservationLogReflectFn(
	model: ModelConfig,
	options: CreateN8nObservationLogReflectFnOptions = {},
): N8nObservationLogReflectFn {
	return async (input) => {
		const { text } = await generateText({
			model: createModel(model),
			system: options.reflectorPrompt ?? DEFAULT_REFLECTOR_PROMPT,
			prompt: buildN8nObservationLogReflectorPrompt(input),
		});

		return text.trim();
	};
}
