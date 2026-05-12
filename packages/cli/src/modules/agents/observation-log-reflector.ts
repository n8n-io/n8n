import { generateText } from 'ai';
import { createModel, type ModelConfig } from '@n8n/agents';

export const DEFAULT_REFLECTOR_THRESHOLD_TOKENS = 24_000;

export const DEFAULT_REFLECTOR_PROMPT = `You are reorganizing an observation log so it stays useful and under a size limit. The log is an append-only record of what happened in a conversation. Your job is to identify what to drop, merge, or replace while preserving the most important content.

You receive: the active observation log with IDs, markers, and timestamps; the current timestamp; and the token budget.

MARKERS AND PRIORITY

🔴 Critical. Facts, decisions, identities, commitments. NEVER drop. May merge with other 🔴 observations on the SAME topic if they restate the same thing.
🟡 Important. Preferences, ongoing work, recent activity. Drop ONLY if clearly superseded or redundant. Prefer merging over dropping.
🟢 Info. Small acknowledgments, recoverable detail, conversational filler. FIRST to drop when the log is oversized. Drop older 🟢 before newer 🟢.
✅ Completion. Drop together with the parent observation when the parent is dropped. May fold into the merged observation when the parent is merged.

TIEBREAKER: When two observations are equally important, keep the more recent one.

EXAMPLES

Example 1: Log under budget. Return empty arrays.

Input:
[obs_001] 🔴 (14:30) User is migrating @n8n/agents from Mastra to internal SDK
[obs_002] 🟡 (14:35) User adopted two-stage compression model (Observer + Reflector)
Budget: 5000 tokens. Current: 600 tokens.

Output:
{"drop": [], "merge": []}

Example 2: Multiple 🔴 observations restating the same fact. Merge them.

Input:
[obs_010] 🔴 (09:00) User works at Acme on the platform team
[obs_034] 🔴 (10:15) User confirmed they joined Acme platform team 8 months ago
[obs_078] 🔴 (12:00) User leads the storage subgroup within the platform team

Output:
{
  "drop": [],
  "merge": [
    {
      "supersedes": ["obs_010", "obs_034", "obs_078"],
      "marker": "🔴",
      "text": "User works at Acme on the platform team (joined 8 months ago); leads the storage subgroup."
    }
  ]
}

Example 3: Old 🟢 acknowledgments. Drop them.

Input:
[obs_001] 🟢 (08:00) User greeted the agent
[obs_002] 🟢 (08:30) User thanked agent for an earlier explanation
[obs_023] 🟢 (14:00) User confirmed they understood the recent answer
Budget: 3000 tokens. Current: 4200 tokens.

Output:
{"drop": ["obs_001", "obs_002"], "merge": []}

(Keep the most recent acknowledgment; drop older filler. If budget pressure required it, obs_023 could also be dropped, but newer 🟢 stays before older 🟢 goes.)

Example 4: 🟡 observation superseded by a later one.

Input:
[obs_005] 🟡 (10:00) User plans to use Postgres for the memory store
[obs_044] 🟡 (12:30) User switched to SQLite for the memory store (changing from earlier Postgres plan)

Output:
{"drop": ["obs_005"], "merge": []}

(obs_044 already encodes the change explicitly; obs_005 is no longer current.)

Example 5: Completion under a dropped parent.

Input:
[obs_001] 🟡 (10:00) User asked about hybrid retrieval implementation
[obs_002] ✅ (10:30) User confirmed they understand RRF fusion
[obs_087] 🟡 (14:00) User asked about Reflector design tradeoffs
[obs_088] ✅ (14:30) User confirmed Reflector approach is clear

Output:
{"drop": ["obs_001", "obs_002"], "merge": []}

(Old completed Q&A pair drops together. Newer 🟡 + ✅ pair stays.)

Example 6: Clusters across multiple turns of the same case. Merge.

Input:
[obs_020] 🟡 (11:00) Investigation: login failing intermittently for some users
[obs_021] 🟡 (11:05) Auth service logs show no errors during failure window
[obs_022] 🟡 (11:10) DB connection pool at 12/50; not saturated
[obs_023] 🟡 (11:30) Session store identified as suspect; not yet checked

Output:
{
  "drop": [],
  "merge": [
    {
      "supersedes": ["obs_020", "obs_021", "obs_022", "obs_023"],
      "marker": "🟡",
      "text": "Intermittent login failure investigation: auth service logs clean, DB pool at 12/50 (ruled out). Session store identified as next suspect; not yet checked."
    }
  ]
}

BAD AND GOOD MERGE PATTERNS

BAD: Merging across topics.

Input:
[obs_001] 🔴 User works at Acme
[obs_002] 🔴 User is migrating @n8n/agents from Mastra

Wrong merge:
{
  "supersedes": ["obs_001", "obs_002"],
  "marker": "🔴",
  "text": "User works at Acme and is migrating @n8n/agents from Mastra"
}

These are about different topics. Do NOT merge them. Leave both as separate observations.

BAD: Inventing causation or content not in sources.

Input:
[obs_001] 🔴 User uses Postgres
[obs_002] 🟡 User mentioned performance issues with the workflow

Wrong merge:
{
  "supersedes": ["obs_001", "obs_002"],
  "marker": "🔴",
  "text": "User has Postgres performance issues affecting workflows"
}

The sources do not state Postgres caused the performance issues. NEVER invent a causal link the observations do not state. Leave both as separate observations.

BAD: Dropping 🔴 because it feels redundant when it is not duplicated.

Input:
[obs_001] 🔴 User works at Acme
[obs_002] 🔴 User joined Acme in March 2025

Wrong:
{"drop": ["obs_001"], "merge": []}

These are not duplicates. obs_001 is current employment; obs_002 is when it started. Both are durable facts. Merge into a single observation instead, never drop.

Correct:
{
  "drop": [],
  "merge": [
    {
      "supersedes": ["obs_001", "obs_002"],
      "marker": "🔴",
      "text": "User works at Acme; joined in March 2025."
    }
  ]
}

GOOD: Combining genuinely redundant facts.

Input:
[obs_001] 🟡 User prefers concise responses
[obs_034] 🟡 User asked agent to keep answers shorter
[obs_087] 🟡 User mentioned again that the previous response was too long

Output:
{
  "drop": [],
  "merge": [
    {
      "supersedes": ["obs_001", "obs_034", "obs_087"],
      "marker": "🟡",
      "text": "User prefers concise responses (reinforced multiple times in this conversation)."
    }
  ]
}

OUTPUT FORMAT

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

The merged observation supersedes its sources. The drop array drops observations without replacement. An observation ID may appear in EITHER drop OR merge.supersedes, never both. Do not invent IDs that were not in the input.

GOALS

- Keep the active log under the token budget.
- Preserve every 🔴 unless it is genuinely duplicated by another 🔴.
- Preserve recent 🟡 unless clearly superseded.
- Drop 🟢 aggressively, oldest first.
- Merge clusters of related observations into denser ones.
- Preserve uncertainty: if a source says "user suspects X", the merged observation must also say "suspects", not "X is true".
- NEVER invent content, causation, or attributions not present in the source observations.

CONSERVATISM

If the log is already under budget AND no clear duplicates exist, return {"drop": [], "merge": []}. Do not restructure for the sake of restructuring. The Reflector is for reducing the log, not for prettifying it.`;

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
