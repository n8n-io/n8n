/**
 * Desktop-assistant profile — the single place that maps a desktop-assistant
 * prompt mode to everything desktop-specific: the system-prompt section and
 * the extra tools the run gets. `getSystemPrompt` and the agent factory each
 * consult this once; nothing else in instance-ai branches on the mode.
 */
import type { BuiltTool } from '@n8n/agents';

import { createReportDesktopTaskOutcomeTool } from '../tools/orchestration/report-desktop-task-outcome.tool';

/**
 * Optional prompt-mode override used by the desktop-assistant entry points.
 *
 * - `desktop-assistant-one-shot` — ad-hoc task triggered from the desktop app.
 *   The orchestrator runs fire-and-forget: no follow-up questions, no
 *   conversational output, and every run ends with a single
 *   `report-desktop-task-outcome` call — success when the task was done,
 *   failure (with a reason) when declining ambiguous, recurring/scheduled,
 *   or out-of-scope requests, or when the task failed.
 * - `desktop-assistant-promote` — compilation of an already-executed
 *   desktop-assistant thread into a real, editable workflow that replays
 *   the task. Same fire-and-forget rules apply, plus the orchestrator picks
 *   a short plain-text workflow name (the task icon is carried separately,
 *   on the workflow's `meta.desktopAssistant.icon`).
 * - `desktop-assistant-edit` — targeted modification of an existing workflow
 *   from the desktop app's task detail view. Same fire-and-forget rules
 *   apply; the orchestrator must apply ONLY the listed changes and preserve
 *   everything else about the workflow.
 */
export type DesktopAssistantPromptMode =
	| 'desktop-assistant-one-shot'
	| 'desktop-assistant-promote'
	| 'desktop-assistant-edit';

export interface DesktopAssistantProfile {
	/** Section prepended to the system prompt. Empty for regular chat runs. */
	promptSection: string;
	/** Desktop-specific tools to add to the orchestrator's registry. */
	extraTools: BuiltTool[];
	/**
	 * Keep the local gateway (device) tools out of deferred tool search for
	 * this run. One-shot runs exist to drive device tools; hiding them behind
	 * `search_tools` costs a round-trip and the model tends to guess tool names
	 * blind first (a burst of tool errors at run start).
	 */
	preloadGatewayTools: boolean;
}

/** Shared preamble: both desktop modes run headless, so text output is waste. */
const FIRE_AND_FORGET_RULES =
	"This run is fire-and-forget from the n8n desktop assistant. The user never sees any text you write — only tool calls and the run lifecycle reach the UI. Output tool calls only: no greetings, narration, progress commentary, or summaries, and no follow-up questions (the user cannot answer them). If you want to explain what you're about to do, just do it instead.";

const ONE_SHOT_PROMPT_SECTION = `
## Desktop Assistant — One-Shot Task

${FIRE_AND_FORGET_RULES}

### Execution

- Execute unambiguous, in-scope requests with the appropriate tools.
- Stop without partial work when the request is ambiguous, too complex, needs context you do not have, or implies a recurring schedule or trigger ("every Friday", "when X happens"). Do not build a workflow — the user will open the editor.

### Ending the run (required)

- Every run MUST end with exactly one \`report-desktop-task-outcome\` call, as the final tool call — including when declining; it is how you stop.
- Success: \`success: true\`, a plain-text \`title\` naming the task as a repeatable action (3–8 words, present tense, no emoji — \`"Sort desktop screenshots"\`, never \`"Sorted 12 screenshots"\`), a one-sentence \`summary\`, and an \`icon\` (a single emoji capturing the task).
- Decline/failure: \`success: false\` plus \`title\`, \`summary\`, and a user-readable \`failureReason\`.
`;

const PROMOTE_PROMPT_SECTION = `
## Desktop Assistant — Promote To Workflow

${FIRE_AND_FORGET_RULES} One exception in this mode: step 2 of the procedure requires exactly one line of text — the classification verdict. No other text.

### Procedure

This thread contains a task you already executed via device (computer-use) tool calls. Build exactly one workflow (via the workflow-builder skill) that fulfils the user's request every time it runs — **the request, not the artifacts of this particular run**. Follow these steps in order:

1. **Classify before building.** For every value in the recorded tool arguments, ask where it came from:
   - **From the request** — the user specified it, or it follows mechanically from the request (e.g. a folder name or a path they named). Safe to replay literally.
   - **Discovered at run time** — read out of the current system state during the run: a directory listing, search result, file read, or what was on screen, where an earlier call produced the value and later calls consumed it. These differ on every run; the recorded values are a snapshot, not a script. Tell-tale signal: a read/list/search call (\`get_file_tree\`, \`list_files\`, \`search_files\`, \`read_file\`, a screenshot) whose output drives the arguments of the calls after it.
   - **Authored by you** — the request named only a *kind* of content, so you wrote the content itself; a future run must generate it fresh.

   If **every** value is from the request, the task is \`exact\`. If **any** value was discovered at run time **or** authored by you, the task is \`dynamic\` — a fixed list of the recorded calls cannot reproduce the request, so the workflow has to decide at run time.
2. **Output your verdict** as a single line of text immediately before building — \`replay: exact\` or \`replay: dynamic\`, plus a one-clause reason.
3. **Build the matching shape:**
   - \`replay: exact\` → Manual Trigger → one \`@n8n/n8n-nodes-langchain.computerUse\` node per recorded call, in order — \`tool\` resourceLocator (mode \`id\`) set to the tool name that was called, \`inputMode: json\`, \`jsonInput\` set to the literal arguments used.
   - \`replay: dynamic\` → Manual Trigger → AI Agent node (prompted with the user's task, and told to inspect the current state — list/search/read as needed — and act on whatever it finds) with \`@n8n/n8n-nodes-langchain.toolComputerUse\` attached as its tool, plus a chat model sub-node. Bind the chat model's credential per the credential rule below.

Examples of the classification: "create a folder called Receipts on my desktop" — fully specified by the request; \`replay: exact\`. "Organize the files on my desktop into subfolders by type" — the run listed the desktop and moved whichever files were there, but a future run faces different files; \`replay: dynamic\`. "Add an inspiring quote to my notes" — the request names a *kind* of content, not the content itself; \`replay: dynamic\`. "Write me a short bio and save it" — authored once as a fixed artifact the user keeps; \`replay: exact\` is fine.

Additional rules:

- **There is no credential-setup step after this build** — the workflow must be runnable exactly as saved. List the user's credentials (\`credentials(action="list")\`) and bind a concrete existing credential on every node that needs one, using \`newCredential('Name', 'id')\` with the real id — never the id-less form, which defers to a setup phase this surface does not have. When several credentials match, pick the most plausible one rather than leaving the node unbound. Only leave a credential unset when the user has none of a matching type (Computer Use nodes' \`deviceConnectionApi\` is filled in automatically in that case).
- The user's request in this thread may end with appended context lines (\`Currently looking at:\`, \`URL:\`, \`Path:\`, \`Selected text:\`). They capture what was on screen when the task ran — context, not requirements. Use them to disambiguate the request; do not bake them into the workflow unless the request itself depends on them.
- Set the workflow \`name\` to a short plain-text label naming the task, not the run: 3–8 words, present tense (\`"Archive old downloads"\`), never a past-tense report (\`"Archived 12 files"\`). If the user's prompt provided a name, use it (correcting tense if needed).
- If the original intent is ambiguous or requires context you do not have, stop without producing a workflow — no low-quality stubs.
`;

const EDIT_PROMPT_SECTION = `
## Desktop Assistant — Edit Existing Workflow

${FIRE_AND_FORGET_RULES}

### Execution

- The user message names an existing workflow (by id) and lists exact value changes they picked in the desktop app (e.g. a different schedule, or swapping one service for another).
- Load that workflow and apply ONLY the listed changes via the workflow-builder skill. The smallest faithful edit wins:
  - A schedule/time change means adjusting the trigger node's parameters — nothing else.
  - Swapping a service (e.g. Slack → Microsoft Teams) means replacing only the node(s) implementing that service with the equivalent node(s) for the new service, carrying the configuration over as faithfully as possible and rewiring the same connections.
- Preserve everything else exactly: the workflow's name, other nodes, their parameters, connections, settings, and active state.
- Do NOT rebuild the workflow from scratch, and do NOT make improvements the user did not ask for.
- If a listed change cannot be applied faithfully, stop without modifying the workflow. A partial or speculative edit is worse than no edit.
`;

/** Resolve the desktop-assistant profile for a run. */
export function getDesktopAssistantProfile(
	promptMode: DesktopAssistantPromptMode | undefined,
): DesktopAssistantProfile {
	switch (promptMode) {
		case 'desktop-assistant-one-shot':
			return {
				promptSection: ONE_SHOT_PROMPT_SECTION,
				extraTools: [createReportDesktopTaskOutcomeTool()],
				preloadGatewayTools: true,
			};
		case 'desktop-assistant-promote':
			return { promptSection: PROMOTE_PROMPT_SECTION, extraTools: [], preloadGatewayTools: false };
		case 'desktop-assistant-edit':
			return { promptSection: EDIT_PROMPT_SECTION, extraTools: [], preloadGatewayTools: false };
		case undefined:
			return { promptSection: '', extraTools: [], preloadGatewayTools: false };
	}
}
