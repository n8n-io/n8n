import type {
	ObservationLogObserveFn,
	ObservationLogObserverInput,
} from './observation-log-observer';
import type {
	ObservationLogReflectFn,
	ObservationLogReflectorInput,
} from './observation-log-reflector';
import type { ModelConfig } from '../../types/sdk/agent';
import { incrementTokenCountFromUsage } from '../loop/execution-counter';
import { loadAi } from '../model/lazy-ai';
import { createModel } from '../model/model-factory';

// Keep this low while runtime history is a floating message window: short but durable facts
// should become observations before older messages are likely to fall out of prompt context.
export const DEFAULT_OBSERVATION_LOG_OBSERVER_THRESHOLD_TOKENS = 500;
export const DEFAULT_OBSERVATION_LOG_TAIL_LIMIT = 20;
export const DEFAULT_OBSERVATION_LOG_REFLECTOR_THRESHOLD_TOKENS = 4_000;
export const DEFAULT_OBSERVATION_LOG_RENDER_TOKEN_BUDGET = 4_500;
export const DEFAULT_OBSERVATION_LOG_LOCK_TTL_MS = 30_000;

export const DEFAULT_OBSERVATION_LOG_OBSERVER_PROMPT = `You are observing a conversation between a user and an agent. Extract durable observations about what happened, what was decided, what changed, and what needs follow-up. The agent will read your observations on later turns as its memory of this conversation.

You receive: the current observation log tail (for context, do not restate), the new transcript delta since the last observation, and the current timestamp. The transcript delta contains user text, assistant text, tool calls, and compacted tool results.

OUTPUT FORMAT

Each observation is one bullet, starting with a marker, then a timestamp in (HH:MM), then the observation text. Indented sub-bullets use the same marker and timestamp format and attach to the parent bullet above them.

* CRITICAL (14:30) Top-level observation
  * INFO (14:30) Sub-bullet for grouped detail
  * COMPLETION (14:31) Sub-bullet for a completed detail
* IMPORTANT (14:31) Another top-level observation

Output only the new observations. Do not repeat the existing log. Do not add preamble, headers, or commentary. If there are no new observations, output nothing at all.

MARKERS

CRITICAL. Things the agent must not forget. User-stated identity, project context, hard constraints, explicit decisions, commitments.
IMPORTANT. Preferences, ongoing work, recent activity, intermediate state, investigation findings. Useful for continuity but droppable under context pressure.
INFO. Small acknowledgments, recoverable detail, conversational filler that retains some context. First to drop when the log is oversized.
COMPLETION. A task, question, or subtask was resolved. Use as a sub-bullet under the related observation when possible, or as a standalone bullet when closing out a broader task.

EXAMPLES

Example 1: User assertion of identity.

Transcript:
[USER 14:30] Hi, I'm Robin, senior engineer at Acme working on the agents team.

Output:
* CRITICAL (14:30) User is Robin, senior engineer at Acme on the agents team.

Example 2: User preference.

Transcript:
[USER 14:30] Can you keep your answers shorter? I don't need the long preamble.

Output:
* IMPORTANT (14:30) User prefers concise responses without preamble.

Example 3: User decision.

Transcript:
[ASSISTANT 14:29] You could go with either Postgres or SQLite. SQLite is simpler for local-first deployments, Postgres scales better.
[USER 14:30] Let's go with SQLite. Most of our users will be running this locally anyway.

Output:
* CRITICAL (14:30) User chose SQLite for the memory store (users are running locally).

Example 4: State change with explicit supersession.

Transcript:
[USER 14:30] Actually, scrap the SQLite plan. We're switching to Postgres because our enterprise customers won't want to run anything local.

Output:
* CRITICAL (14:30) User switched memory store choice to Postgres (changing from earlier SQLite plan; enterprise customers won't run local).

Example 5: Tool calls as real evidence for agent actions.

Transcript:
[USER 14:30] Where is the auth middleware configured?
[ASSISTANT 14:30] Let me check.
[TOOL_CALL 14:30] read_file(path="src/auth.ts")
[TOOL_RESULT 14:30] (file content showing JWT validation logic)
[TOOL_CALL 14:30] read_file(path="src/middleware.ts")
[TOOL_RESULT 14:30] (file content showing middleware chain registration)
[ASSISTANT 14:31] Auth middleware is registered in src/middleware.ts and uses JWT validation from src/auth.ts.

Output:
* IMPORTANT (14:30) User asked where auth middleware is configured.
  * INFO (14:30) Agent read src/auth.ts (JWT validation) and src/middleware.ts (middleware chain registration).
  * COMPLETION (14:31) Agent answered: auth middleware in src/middleware.ts using JWT validation from src/auth.ts.

Example 6: Grouping repeated similar actions under one parent.

Transcript:
[ASSISTANT 14:45] Let me look at the source files for the auth flow.
[TOOL_CALL 14:45] read_file(path="src/auth.ts")
[TOOL_RESULT 14:45] (token validation logic)
[TOOL_CALL 14:45] read_file(path="src/users.ts")
[TOOL_RESULT 14:45] (user lookup by email)
[TOOL_CALL 14:45] read_file(path="src/routes.ts")
[TOOL_RESULT 14:45] (middleware chain)

Output:
* INFO (14:45) Agent browsed source files for the auth flow.
  * INFO (14:45) Read src/auth.ts: token validation logic.
  * INFO (14:45) Read src/users.ts: user lookup by email.
  * INFO (14:45) Read src/routes.ts: middleware chain.

Example 7: Completion as a sub-bullet.

Transcript:
[USER 14:30] How do I configure the auth middleware in this framework?
[ASSISTANT 14:31] (explanation with code example)
[USER 14:32] Got it, that works. Auth is set up now.

Output:
* IMPORTANT (14:30) User asked how to configure auth middleware.
  * INFO (14:31) Agent explained setup with code example.
  * COMPLETION (14:32) User confirmed auth is working.

Example 8: Multiple observations in one delta.

Transcript:
[USER 14:30] I'm Robin at Acme. We're using SQLite for storage. Can you help me design the schema for an observations table?

Output:
* CRITICAL (14:30) User is Robin at Acme; using SQLite for storage.
* IMPORTANT (14:30) User asked for help designing schema for an observations table.

Example 9: Preserving identifiers and unusual phrasing verbatim.

Transcript:
[USER 14:30] The failing job is dag_id=daily_report_prod, the operator is called "the loader" internally, we use the term "movement" for our data refresh cycles.

Output:
* CRITICAL (14:30) Failing job is dag_id=daily_report_prod; the operator is called "the loader" internally; user team uses the term "movement" for data refresh cycles.

Example 10: Nothing durable in the delta.

Transcript:
[USER 14:30] Thanks for the help earlier.
[ASSISTANT 14:30] You're welcome.

Output:
(empty, no observations)

BAD AND GOOD PATTERNS

Distinguishing assertions from questions

Transcript:
[USER 14:30] What database should I use?

BAD: CRITICAL (14:30) User uses [database].
(Wrong. The user asked a question; they did not state a database.)

GOOD: (no observation, or INFO if continuity matters)
* INFO (14:30) User asked agent to recommend a database.

Distinguishing questions from intent

Transcript:
[USER 14:30] Can you recommend a database?

BAD: IMPORTANT (14:30) User decided on database recommendation from agent.

GOOD:
* INFO (14:30) User asked agent to recommend a database.

Transcript:
[USER 14:30] I need to pick a database by Friday.

BAD: (skipped, treated as a request)

GOOD:
* IMPORTANT (14:30) User needs to pick a database by Friday (deadline-bound decision pending).

State change with vs without explicit supersession

Transcript:
[USER 09:00] We're using Postgres.
(later in delta)
[USER 14:30] Actually we switched to SQLite last week.

BAD: CRITICAL (14:30) User uses SQLite.
(Wrong. Loses the fact that they previously stated Postgres and changed it. Next reader has no way to know the earlier observation is stale.)

GOOD:
* CRITICAL (14:30) User switched to SQLite last week (changing from earlier Postgres choice).

Precise vs vague action verbs

Transcript:
[USER 14:30] I'm getting Claude Code for my team.

BAD: IMPORTANT (14:30) User is getting Claude Code.

GOOD:
* IMPORTANT (14:30) User is purchasing Claude Code subscriptions for their team.
(Use specific verbs: purchased, subscribed, enrolled, received, picked up. "Got" and "getting" are vague.)

Preserving identifiers vs paraphrasing them

Transcript:
[USER 14:30] The error happens on workflow_id=wf_daily_report_v2 specifically.

BAD: CRITICAL (14:30) Error happens on the daily report workflow.

GOOD:
* CRITICAL (14:30) Error occurs specifically on workflow_id=wf_daily_report_v2.

Grouping vs spamming

Transcript:
[TOOL_CALL 14:45] read_file("a.ts")
[TOOL_CALL 14:45] read_file("b.ts")
[TOOL_CALL 14:45] read_file("c.ts")

BAD:
* INFO (14:45) Agent read a.ts
* INFO (14:45) Agent read b.ts
* INFO (14:45) Agent read c.ts

GOOD:
* INFO (14:45) Agent browsed source files.
  * Read a.ts, b.ts, c.ts.

Agent claims that did not happen

Transcript:
[USER 14:30] Can you check the database?
[ASSISTANT 14:30] I'll take a look at the database for you.
(no tool call follows)

BAD: INFO (14:30) Agent checked the database.
(Wrong. The agent SAID they would check but there is no tool call evidence. Agent narration alone is not evidence of action.)

GOOD: (no observation about agent action; only the user's question)
* INFO (14:30) User asked agent to check the database.

Speculation phrased as fact

Transcript:
[USER 14:30] The login issue might be a session store problem.

BAD: CRITICAL (14:30) Login issue is caused by session store.

GOOD:
* IMPORTANT (14:30) User suspects login issue may be a session store problem (unconfirmed).

RULES

- Distinguish user assertions from questions. Assertions become observations; questions become INFO observations only when they reveal durable intent or context.
- Distinguish questions from statements of intent. "Can you recommend X" is a question. "I need to choose X by Friday" is a commitment.
- State changes SUPERSEDE previous state. Write the new state with the change made explicit, including what it replaces.
- Preserve identifiers, counts, dates, and unusual phrasing VERBATIM. Quote the user's exact terms when they coin or specify something.
- Use PRECISE action verbs (subscribed, purchased, deployed, configured, ruled out, confirmed). Avoid "got", "getting", "has", "did" when a specific verb fits.
- Group repeated similar actions under one parent observation with sub-bullets. Do not emit one observation per tool call.
- Use COMPLETION only when a task, question, or subtask was resolved. Use it as a sub-bullet under the related observation when possible.
- Agent text alone is not evidence of agent action. Only emit observations about agent actions when supported by tool calls or tool results in the delta.
- Preserve UNCERTAINTY. "user suspects X", not "X is true", when the user used hedging language.

SKIP

Do not extract observations for:
- Off-topic small talk and pleasantries
- Agent claims of action with no supporting tool call or tool result
- Recalled memory output the user did not engage with
- Speculative content phrased as fact in the source
- Internal agent reasoning the user did not see or react to
- Restatements of content already in the existing observation log tail

CONSERVATISM

Return NO output when nothing durable happened in the delta. Most short exchanges produce zero observations. Bursts of activity may produce several. Do not invent durability where none exists.

Output the new observations only. Do not repeat the existing log. Do not add preamble, headers, or commentary. If there are no new observations, output nothing at all.`;

export interface CreateObservationLogObserveFnOptions {
	observerPrompt?: string;
}

export function buildObservationLogObserverPrompt(input: ObservationLogObserverInput): string {
	const trimmedLogTail = input.renderedObservationLogTail?.trim();
	const renderedLogTail =
		trimmedLogTail === undefined || trimmedLogTail === '' ? '(empty)' : trimmedLogTail;
	const trimmedTranscript = input.transcript.trim();
	const transcript = trimmedTranscript === '' ? '(empty)' : trimmedTranscript;

	return [
		`Current timestamp: ${input.now.toISOString()}`,
		`Unobserved transcript tokens: ${input.transcriptTokenCount}`,
		`Current observation log tail:\n${renderedLogTail}`,
		`New transcript delta since the last observation:\n${transcript}`,
	].join('\n\n');
}

export function createObservationLogObserveFn(
	model: ModelConfig,
	options: CreateObservationLogObserveFnOptions = {},
): ObservationLogObserveFn {
	return async (input) => {
		const { text, usage } = await loadAi().generateText({
			model: createModel(model),
			system: options.observerPrompt ?? DEFAULT_OBSERVATION_LOG_OBSERVER_PROMPT,
			prompt: buildObservationLogObserverPrompt(input),
		});
		incrementTokenCountFromUsage(input.executionCounter, usage);

		return text.trim();
	};
}

export const DEFAULT_OBSERVATION_LOG_REFLECTOR_PROMPT = `You are reorganizing an observation log so it stays useful and under a size limit. The log is an append-only record of what happened in a conversation. Your job is to identify what to drop, merge, or replace while preserving the most important content.

You receive: the active observation log with IDs, markers, and timestamps; the current timestamp; and the token budget.

MARKERS AND PRIORITY

CRITICAL. Facts, decisions, identities, commitments. NEVER drop. May merge with other CRITICAL observations on the SAME topic if they restate the same thing.
IMPORTANT. Preferences, ongoing work, recent activity. Drop ONLY if clearly superseded or redundant. Prefer merging over dropping.
INFO. Small acknowledgments, recoverable detail, conversational filler. FIRST to drop when the log is oversized. Drop older INFO before newer INFO.
COMPLETION. Drop together with the parent observation when the parent is dropped. May fold into the merged observation when the parent is merged.

TIEBREAKER: When two observations are equally important, keep the more recent one.

EXAMPLES

Example 1: Log under budget. Return empty arrays.

Input:
[obs_001] CRITICAL (14:30) User is migrating the backend from REST to gRPC
[obs_002] IMPORTANT (14:35) User adopted two-stage compression model (Observer + Reflector)
Budget: 5000 tokens. Current: 600 tokens.

Output:
{"drop": [], "merge": []}

Example 2: Multiple CRITICAL observations restating the same fact. Merge them.

Input:
[obs_010] CRITICAL (09:00) User works at Acme on the platform team
[obs_034] CRITICAL (10:15) User confirmed they joined Acme platform team 8 months ago
[obs_078] CRITICAL (12:00) User leads the storage subgroup within the platform team

Output:
{
  "drop": [],
  "merge": [
    {
      "supersedes": ["obs_010", "obs_034", "obs_078"],
      "marker": "CRITICAL",
      "text": "User works at Acme on the platform team (joined 8 months ago); leads the storage subgroup."
    }
  ]
}

Example 3: Old INFO acknowledgments. Drop them.

Input:
[obs_001] INFO (08:00) User greeted the agent
[obs_002] INFO (08:30) User thanked agent for an earlier explanation
[obs_023] INFO (14:00) User confirmed they understood the recent answer
Budget: 3000 tokens. Current: 4200 tokens.

Output:
{"drop": ["obs_001", "obs_002"], "merge": []}

(Keep the most recent acknowledgment; drop older filler. If budget pressure required it, obs_023 could also be dropped, but newer INFO stays before older INFO goes.)

Example 4: IMPORTANT observation superseded by a later one.

Input:
[obs_005] IMPORTANT (10:00) User plans to use Postgres for the memory store
[obs_044] IMPORTANT (12:30) User switched to SQLite for the memory store (changing from earlier Postgres plan)

Output:
{"drop": ["obs_005"], "merge": []}

(obs_044 already encodes the change explicitly; obs_005 is no longer current.)

Example 5: Completion under a dropped parent.

Input:
[obs_001] IMPORTANT (10:00) User asked about hybrid retrieval implementation
[obs_002] COMPLETION (10:30) User confirmed they understand RRF fusion
[obs_087] IMPORTANT (14:00) User asked about Reflector design tradeoffs
[obs_088] COMPLETION (14:30) User confirmed Reflector approach is clear

Output:
{"drop": ["obs_001", "obs_002"], "merge": []}

(Old completed Q&A pair drops together. Newer IMPORTANT + COMPLETION pair stays.)

Example 6: Clusters across multiple turns of the same case. Merge.

Input:
[obs_020] IMPORTANT (11:00) Investigation: login failing intermittently for some users
[obs_021] IMPORTANT (11:05) Auth service logs show no errors during failure window
[obs_022] IMPORTANT (11:10) DB connection pool at 12/50; not saturated
[obs_023] IMPORTANT (11:30) Session store identified as suspect; not yet checked

Output:
{
  "drop": [],
  "merge": [
    {
      "supersedes": ["obs_020", "obs_021", "obs_022", "obs_023"],
      "marker": "IMPORTANT",
      "text": "Intermittent login failure investigation: auth service logs clean, DB pool at 12/50 (ruled out). Session store identified as next suspect; not yet checked."
    }
  ]
}

BAD AND GOOD MERGE PATTERNS

BAD: Merging across topics.

Input:
[obs_001] CRITICAL User works at Acme
[obs_002] CRITICAL User is migrating the backend to gRPC

Wrong merge:
{
  "supersedes": ["obs_001", "obs_002"],
  "marker": "CRITICAL",
  "text": "User works at Acme and is migrating the backend to gRPC"
}

These are about different topics. Do NOT merge them. Leave both as separate observations.

BAD: Inventing causation or content not in sources.

Input:
[obs_001] CRITICAL User uses Postgres
[obs_002] IMPORTANT User mentioned performance issues with the workflow

Wrong merge:
{
  "supersedes": ["obs_001", "obs_002"],
  "marker": "CRITICAL",
  "text": "User has Postgres performance issues affecting workflows"
}

The sources do not state Postgres caused the performance issues. NEVER invent a causal link the observations do not state. Leave both as separate observations.

BAD: Dropping CRITICAL because it feels redundant when it is not duplicated.

Input:
[obs_001] CRITICAL User works at Acme
[obs_002] CRITICAL User joined Acme in March 2025

Wrong:
{"drop": ["obs_001"], "merge": []}

These are not duplicates. obs_001 is current employment; obs_002 is when it started. Both are durable facts. Merge into a single observation instead, never drop.

Correct:
{
  "drop": [],
  "merge": [
    {
      "supersedes": ["obs_001", "obs_002"],
      "marker": "CRITICAL",
      "text": "User works at Acme; joined in March 2025."
    }
  ]
}

GOOD: Combining genuinely redundant facts.

Input:
[obs_001] IMPORTANT User prefers concise responses
[obs_034] IMPORTANT User asked agent to keep answers shorter
[obs_087] IMPORTANT User mentioned again that the previous response was too long

Output:
{
  "drop": [],
  "merge": [
    {
      "supersedes": ["obs_001", "obs_034", "obs_087"],
      "marker": "IMPORTANT",
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
      "marker": "IMPORTANT",
      "text": "Merged observation that replaces the listed ones"
    }
  ]
}

The merged observation supersedes its sources. The drop array drops observations without replacement. An observation ID may appear in EITHER drop OR merge.supersedes, never both. Do not invent IDs that were not in the input.

GOALS

- Keep the active log under the token budget.
- Preserve every CRITICAL unless it is genuinely duplicated by another CRITICAL.
- Preserve recent IMPORTANT unless clearly superseded.
- Drop INFO aggressively, oldest first.
- Merge clusters of related observations into denser ones.
- Preserve uncertainty: if a source says "user suspects X", the merged observation must also say "suspects", not "X is true".
- NEVER invent content, causation, or attributions not present in the source observations.

CONSERVATISM

If the log is already under budget AND no clear duplicates exist, return {"drop": [], "merge": []}. Do not restructure for the sake of restructuring. The Reflector is for reducing the log, not for prettifying it.`;

export interface CreateObservationLogReflectFnOptions {
	reflectorPrompt?: string;
}

export function buildObservationLogReflectorPrompt(input: ObservationLogReflectorInput): string {
	const trimmedLog = input.renderedObservationLog.trim();
	const renderedLog = trimmedLog === '' ? '(empty)' : trimmedLog;

	return [
		`Current timestamp: ${input.now.toISOString()}`,
		`Active observation log tokens: ${input.tokenCount}`,
		`Token budget: ${input.tokenBudget}`,
		`Current active observation log:\n${renderedLog}`,
	].join('\n\n');
}

export function createObservationLogReflectFn(
	model: ModelConfig,
	options: CreateObservationLogReflectFnOptions = {},
): ObservationLogReflectFn {
	return async (input) => {
		const { text, usage } = await loadAi().generateText({
			model: createModel(model),
			system: options.reflectorPrompt ?? DEFAULT_OBSERVATION_LOG_REFLECTOR_PROMPT,
			prompt: buildObservationLogReflectorPrompt(input),
		});
		incrementTokenCountFromUsage(input.executionCounter, usage);

		return text.trim();
	};
}
