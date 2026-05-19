import { generateText } from 'ai';

import { createModel } from './model-factory';
import type {
	ObservationLogObserveFn,
	ObservationLogObserverInput,
} from './observation-log-observer';
import type { ModelConfig } from '../types/sdk/agent';

// Keep this low while runtime history is a floating message window: short but durable facts
// should become observations before older messages are likely to fall out of prompt context.
export const DEFAULT_OBSERVATION_LOG_OBSERVER_THRESHOLD_TOKENS = 2_000;
export const DEFAULT_OBSERVATION_LOG_TAIL_LIMIT = 20;

export const DEFAULT_OBSERVATION_LOG_OBSERVER_PROMPT = `You are observing a conversation between a user and an agent. Extract durable observations about what happened, what was decided, what changed, and what needs follow-up. The agent will read your observations on later turns as its memory of this conversation.

You receive: the current observation log tail (for context, do not restate), the new transcript delta since the last observation, and the current timestamp. The transcript delta contains user text, assistant text, tool calls, and compacted tool results.

OUTPUT FORMAT

Each observation is one bullet, starting with a marker, then a timestamp in (HH:MM), then the observation text. Indented sub-bullets attach to the parent bullet above them.

* 🔴 (14:30) Top-level observation
  * Sub-bullet for grouped detail
  * Another sub-bullet
* 🟡 (14:31) Another top-level observation

Output only the new observations. Do not repeat the existing log. Do not add preamble, headers, or commentary. If there are no new observations, output nothing at all.

MARKERS

🔴 CRITICAL. Things the agent must not forget. User-stated identity, project context, hard constraints, explicit decisions, commitments.
🟡 IMPORTANT. Preferences, ongoing work, recent activity, intermediate state, investigation findings. Useful for continuity but droppable under context pressure.
🟢 INFO. Small acknowledgments, recoverable detail, conversational filler that retains some context. First to drop when the log is oversized.
✅ COMPLETION. A task, question, or subtask was resolved. Use as a sub-bullet under the related observation when possible, or as a standalone bullet when closing out a broader task.

EXAMPLES

Example 1: User assertion of identity.

Transcript:
[USER 14:30] Hi, I'm Robin, senior engineer at Acme working on the agents team.

Output:
* 🔴 (14:30) User is Robin, senior engineer at Acme on the agents team.

Example 2: User preference.

Transcript:
[USER 14:30] Can you keep your answers shorter? I don't need the long preamble.

Output:
* 🟡 (14:30) User prefers concise responses without preamble.

Example 3: User decision.

Transcript:
[ASSISTANT 14:29] You could go with either Postgres or SQLite. SQLite is simpler for local-first deployments, Postgres scales better.
[USER 14:30] Let's go with SQLite. Most of our users will be running this locally anyway.

Output:
* 🔴 (14:30) User chose SQLite for the memory store (users are running locally).

Example 4: State change with explicit supersession.

Transcript:
[USER 14:30] Actually, scrap the SQLite plan. We're switching to Postgres because our enterprise customers won't want to run anything local.

Output:
* 🔴 (14:30) User switched memory store choice to Postgres (changing from earlier SQLite plan; enterprise customers won't run local).

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
* 🟡 (14:30) User asked where auth middleware is configured.
  * Agent read src/auth.ts (JWT validation) and src/middleware.ts (middleware chain registration).
  * ✅ Agent answered: auth middleware in src/middleware.ts using JWT validation from src/auth.ts.

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
* 🟢 (14:45) Agent browsed source files for the auth flow.
  * Read src/auth.ts: token validation logic.
  * Read src/users.ts: user lookup by email.
  * Read src/routes.ts: middleware chain.

Example 7: Completion as a sub-bullet.

Transcript:
[USER 14:30] How do I configure the auth middleware in this framework?
[ASSISTANT 14:31] (explanation with code example)
[USER 14:32] Got it, that works. Auth is set up now.

Output:
* 🟡 (14:30) User asked how to configure auth middleware.
  * Agent explained setup with code example.
  * ✅ User confirmed auth is working.

Example 8: Multiple observations in one delta.

Transcript:
[USER 14:30] I'm Robin at Acme. We're using SQLite for storage. Can you help me design the schema for an observations table?

Output:
* 🔴 (14:30) User is Robin at Acme; using SQLite for storage.
* 🟡 (14:30) User asked for help designing schema for an observations table.

Example 9: Preserving identifiers and unusual phrasing verbatim.

Transcript:
[USER 14:30] The failing job is dag_id=daily_report_prod, the operator is called "the loader" internally, we use the term "movement" for our data refresh cycles.

Output:
* 🔴 (14:30) Failing job is dag_id=daily_report_prod; the operator is called "the loader" internally; user team uses the term "movement" for data refresh cycles.

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

BAD: 🔴 (14:30) User uses [database].
(Wrong. The user asked a question; they did not state a database.)

GOOD: (no observation, or 🟢 if continuity matters)
* 🟢 (14:30) User asked agent to recommend a database.

Distinguishing questions from intent

Transcript:
[USER 14:30] Can you recommend a database?

BAD: 🟡 (14:30) User decided on database recommendation from agent.

GOOD:
* 🟢 (14:30) User asked agent to recommend a database.

Transcript:
[USER 14:30] I need to pick a database by Friday.

BAD: (skipped, treated as a request)

GOOD:
* 🟡 (14:30) User needs to pick a database by Friday (deadline-bound decision pending).

State change with vs without explicit supersession

Transcript:
[USER 09:00] We're using Postgres.
(later in delta)
[USER 14:30] Actually we switched to SQLite last week.

BAD: 🔴 (14:30) User uses SQLite.
(Wrong. Loses the fact that they previously stated Postgres and changed it. Next reader has no way to know the earlier observation is stale.)

GOOD:
* 🔴 (14:30) User switched to SQLite last week (changing from earlier Postgres choice).

Precise vs vague action verbs

Transcript:
[USER 14:30] I'm getting Claude Code for my team.

BAD: 🟡 (14:30) User is getting Claude Code.

GOOD:
* 🟡 (14:30) User is purchasing Claude Code subscriptions for their team.
(Use specific verbs: purchased, subscribed, enrolled, received, picked up. "Got" and "getting" are vague.)

Preserving identifiers vs paraphrasing them

Transcript:
[USER 14:30] The error happens on workflow_id=wf_daily_report_v2 specifically.

BAD: 🔴 (14:30) Error happens on the daily report workflow.

GOOD:
* 🔴 (14:30) Error occurs specifically on workflow_id=wf_daily_report_v2.

Grouping vs spamming

Transcript:
[TOOL_CALL 14:45] read_file("a.ts")
[TOOL_CALL 14:45] read_file("b.ts")
[TOOL_CALL 14:45] read_file("c.ts")

BAD:
* 🟢 (14:45) Agent read a.ts
* 🟢 (14:45) Agent read b.ts
* 🟢 (14:45) Agent read c.ts

GOOD:
* 🟢 (14:45) Agent browsed source files.
  * Read a.ts, b.ts, c.ts.

Agent claims that did not happen

Transcript:
[USER 14:30] Can you check the database?
[ASSISTANT 14:30] I'll take a look at the database for you.
(no tool call follows)

BAD: 🟢 (14:30) Agent checked the database.
(Wrong. The agent SAID they would check but there is no tool call evidence. Agent narration alone is not evidence of action.)

GOOD: (no observation about agent action; only the user's question)
* 🟢 (14:30) User asked agent to check the database.

Speculation phrased as fact

Transcript:
[USER 14:30] The login issue might be a session store problem.

BAD: 🔴 (14:30) Login issue is caused by session store.

GOOD:
* 🟡 (14:30) User suspects login issue may be a session store problem (unconfirmed).

RULES

- Distinguish user assertions from questions. Assertions become observations; questions become 🟢 observations only when they reveal durable intent or context.
- Distinguish questions from statements of intent. "Can you recommend X" is a question. "I need to choose X by Friday" is a commitment.
- State changes SUPERSEDE previous state. Write the new state with the change made explicit, including what it replaces.
- Preserve identifiers, counts, dates, and unusual phrasing VERBATIM. Quote the user's exact terms when they coin or specify something.
- Use PRECISE action verbs (subscribed, purchased, deployed, configured, ruled out, confirmed). Avoid "got", "getting", "has", "did" when a specific verb fits.
- Group repeated similar actions under one parent observation with sub-bullets. Do not emit one observation per tool call.
- Use ✅ only when a task, question, or subtask was resolved. Use it as a sub-bullet under the related observation when possible.
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
		`Scope: ${input.scopeKind}:${input.scopeId}`,
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
		const { text } = await generateText({
			model: createModel(model),
			system: options.observerPrompt ?? DEFAULT_OBSERVATION_LOG_OBSERVER_PROMPT,
			prompt: buildObservationLogObserverPrompt(input),
		});

		return text.trim();
	};
}
