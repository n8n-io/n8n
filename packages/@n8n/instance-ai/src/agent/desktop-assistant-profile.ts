/**
 * Desktop-assistant profile — the single place that maps a desktop-assistant
 * prompt mode to everything desktop-specific: the system-prompt section and
 * the extra tools the run gets. `getSystemPrompt` and the agent factory each
 * consult this once; nothing else in instance-ai branches on the mode.
 */
import type { BuiltTool } from '@n8n/agents';

import {
	CHANNEL_PARAM_GUIDANCE,
	PARAM_OPTIONS_COUNT_GUIDANCE,
} from '../desktop-assistant/description-parts';
import type { PatchableThreadMemory } from '../storage/thread-patch';
import { createProposeTaskPlanTool } from '../tools/orchestration/propose-task-plan.tool';
import { createReportDesktopTaskOutcomeTool } from '../tools/orchestration/report-desktop-task-outcome.tool';
import { createReportPromoteOutcomeTool } from '../tools/orchestration/report-promote-outcome.tool';

/**
 * Optional prompt-mode override used by the desktop-assistant entry points.
 *
 * - `desktop-assistant-one-shot` — ad-hoc task triggered from the desktop app.
 *   The orchestrator runs fire-and-forget: no follow-up questions, no
 *   conversational output, and every run ends with exactly one of two tools:
 *   `propose-task-plan` (first and only call, for requests implying a
 *   non-manual trigger — the task is planned, not executed) or
 *   `report-desktop-task-outcome` (all other runs — success when the task was
 *   done, failure with a reason when declining ambiguous or out-of-scope
 *   requests, or when the task failed).
 * - `desktop-assistant-promote` — compilation of a desktop-assistant thread
 *   into a real, editable workflow: either a replay of an already-executed
 *   task, or — when the thread holds a user-configured task plan instead —
 *   a build grounded directly on that plan. Same fire-and-forget rules apply,
 *   plus the orchestrator picks a short plain-text workflow name (the task
 *   icon is carried separately, on the workflow's
 *   `meta.desktopAssistant.icon`). Every run ends with
 *   `report-promote-outcome` — the explicit completion signal the confirming
 *   promote call settles from: success carries the workflow id to finalize,
 *   failure a user-readable reason; ending without a report reads as failed.
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
	/**
	 * Auto-defer credential/parameter setup instead of suspending on it. Desktop
	 * runs are fire-and-forget with no surface to answer a "configure
	 * credentials" prompt — suspending there hangs the run. With this set, the
	 * `workflows`/`credentials` setup actions skip the suspend and the workflow
	 * is saved credential-less, surfacing in the desktop app's "Action needed".
	 */
	suppressInteractiveSetup: boolean;
	/**
	 * Skip the HITL "Edit <workflow>?" confirmation on `build-workflow` updates.
	 * Edit-mode runs are launched from the task detail view after the user picked
	 * the exact changes and pressed Done — that interaction is the approval, and
	 * the run has no surface to answer a suspend (it would hang until timeout).
	 */
	preApproveWorkflowEdits: boolean;
}

/** Shared preamble: both desktop modes run headless, so text output is waste. */
const FIRE_AND_FORGET_RULES =
	"This run is fire-and-forget from the n8n desktop assistant. The user never sees any text you write — only tool calls and the run lifecycle reach the UI. Output tool calls only: no greetings, narration, or progress commentary, and no follow-up questions (the user cannot answer them). If you want to explain what you're about to do, just do it instead.";

const ONE_SHOT_PROMPT_SECTION = `
## Desktop Assistant — One-Shot Task

${FIRE_AND_FORGET_RULES}

### Decide first

- Before ANY other tool call, classify the request. If it implies a non-manual trigger — a schedule or recurrence ("every Friday", "each morning", "weekly") or reacting to events ("when X happens", "whenever I get…", watching/polling a service for changes) — do NOT execute anything: call \`propose-task-plan\` as the first and only tool call of the run, then end the run. The user reviews and configures the plan in the desktop app.
- In the plan's \`parts\`, every param MUST carry realistic alternatives in \`options\` (never repeating its current value) — the draft view renders each param as a dropdown, and a param without options is a dead control. Offer ${PARAM_OPTIONS_COUNT_GUIDANCE}.
- ${CHANNEL_PARAM_GUIDANCE} For a channel param, offer alternative integrations you know n8n supports.
- Everything else is a one-off task: execute it now per the rules below.

### Execution

- Execute unambiguous, in-scope requests with the appropriate tools.
- Stop without partial work when the request is ambiguous, too complex, or needs context you do not have. Do not build a workflow — the user will open the editor.

### Ending the run (required)

- Every run MUST end with exactly one of two tools, as the final tool call — never both:
  - \`propose-task-plan\` — non-manual-trigger requests only; it is the run's first and only tool call.
  - \`report-desktop-task-outcome\` — all other runs, including declines; it is how you stop.
- Success: \`success: true\`, a plain-text \`title\` naming the task as a repeatable action (3–8 words, present tense, no emoji — \`"Sort desktop screenshots"\`, never \`"Sorted 12 screenshots"\`), a one-sentence \`summary\`, and an \`icon\` (a single emoji capturing the task).
- Deliverable: when the request asks for information — a summary, an answer to a question, extracted data — the outcome card is the only thing the user ever sees, so the full deliverable MUST go in \`details\` as markdown; a deliverable not in \`details\` is lost. Keep it under ~300 words unless the request calls for more. Omit \`details\` when the result is an action on the system (files moved, message sent) rather than information.
- Decline/failure: \`success: false\` plus \`title\`, \`summary\`, and a user-readable \`failureReason\`.
- If the task built and saved a workflow, include its id as \`workflowId\` so the instance can publish it.
`;

const PROMOTE_PROMPT_SECTION = `
## Desktop Assistant — Promote To Workflow

${FIRE_AND_FORGET_RULES}

### Goal

This thread contains a task you already carried out on the user's machine via device (computer-use) tool calls. Build exactly one workflow (via the workflow-builder skill) that fulfils the user's request every time it runs. The request is the spec; the recorded run is evidence of how to do it once. The judgment call is which recorded values replay literally on every run and which the user expects to be different each time.

### Building blocks

- A recorded action replays as a \`@n8n/n8n-nodes-langchain.computerUse\` node: \`tool\` resourceLocator (mode \`id\`) set to the recorded tool name, \`inputMode: json\`, \`jsonInput\` carrying the arguments. Only values that came from the request (or follow mechanically from it) are safe to replay literally.
- Content that must be produced fresh each run comes from one Basic LLM Chain (\`@n8n/n8n-nodes-langchain.chainLlm\`) with a chat model sub-node, prompted to output only the content, feeding the action node(s) via an expression (e.g. \`{{ $json.text }}\`).
- An AI Agent with \`@n8n/n8n-nodes-langchain.toolComputerUse\` attached (plus a chat model sub-node) is the shape of last resort, for tasks whose *actions* — not just content — depend on what the run finds. Tell-tale signal: a read/list/search call (\`get_file_tree\`, \`list_files\`, \`search_files\`, \`read_file\`, a screenshot) whose output drives the arguments of the calls after it — those values are a snapshot of one run, not a script. An agent picks its own steps and may repeat them, so whenever the action sequence is knowable in advance, build it as fixed nodes instead.

Every build starts from a Manual Trigger.

### Examples

- "Move the budget spreadsheet from my desktop into my Finance folder" — every value came from the user. Manual Trigger → the recorded computerUse call(s), arguments verbatim.
- "Add a fun fact about the ocean to my facts file" — the request names a *kind* of content; the fact in the recorded run was authored on the spot, so each run needs a new one. Manual Trigger → Basic LLM Chain generating one fresh fact → the recorded computerUse save call, with the authored text in \`jsonInput\` replaced by \`{{ $json.text }}\`. One fact per run, no agent.
- "Save a packing checklist for my trips into my documents" — authored content, but authored *once* as a fixed artifact the user keeps. Replaying the recorded calls verbatim is correct; regenerating would overwrite the thing they wanted kept.
- "File whatever is in my screenshots folder into dated subfolders" — which files exist differs every run, so no fixed node sequence can express it. Manual Trigger → AI Agent prompted with the task, \`@n8n/n8n-nodes-langchain.toolComputerUse\` attached.

### Plan-configured builds

When the user message says the thread contains a configured task plan instead of an executed run, build one workflow directly from the configured description, treating its values as the user's final choices. Start from the trigger the description implies — a Schedule Trigger for time-based plans, the matching app trigger or a polling shape for event-driven ones — never a Manual Trigger. The same building blocks apply: generated content gets one LLM Chain step feeding fixed action node(s), not an agent.

### Rules for every promote build

These apply to replay builds and plan-configured builds alike, and override the workflow-builder skill where they conflict.

- **There is no setup step after this build** — the saved workflow is final and must be runnable exactly as saved. The workflow-builder skill's placeholder guidance assumes a setup card collects values after the build; this surface has none, so a deferred value is a dead value the user sees as a broken parameter.
- **Never use \`placeholder()\`.** Every node parameter must hold a real, runnable value. When a value needs to be looked up — a resource id, a coin/channel/board/spreadsheet id — research it now instead of deferring it: take it from the recorded run, resolve it via \`nodes(action="explore-resources")\` or the service's own search/list operation, or derive it from the request. When several candidates match, commit to the most plausible one. Only when a value genuinely cannot be determined should you stop and report failure naming the missing value — never save a workflow containing a placeholder.
- **Bind a concrete credential on every node that needs one.** List the user's credentials (\`credentials(action="list")\`) and use \`newCredential('Name', 'id')\` with the real id — never the id-less form, which defers to a setup phase this surface does not have. When several credentials match, pick the most plausible one rather than leaving the node unbound. Only leave a credential unset when the user has none of a matching type (Computer Use nodes' \`deviceConnectionApi\` is filled in automatically in that case). When you do leave a credential unset, do NOT call the setup action — save the workflow as-is; it will surface in the desktop app for the user to connect the credential later.
- **The task runs exactly once per execution.** n8n executes a node once per incoming item, so a node that emits several items makes every downstream action repeat — a "send one reminder" task would send N. Where an intermediate node can produce multiple items, collapse them to a single item before the action node(s) (an Aggregate node, or \`executeOnce: true\` on the action node), and never add loop shapes around the task itself.
- The user's request in this thread may end with appended context lines (\`Currently looking at:\`, \`URL:\`, \`Path:\`, \`Selected text:\`). They capture what was on screen when the task ran — context, not requirements. Use them to disambiguate the request; do not bake them into the workflow unless the request itself depends on them.
- Set the workflow \`name\` to a short plain-text label naming the task, not the run: 3–8 words, present tense (\`"Archive old downloads"\`), never a past-tense report (\`"Archived 12 files"\`). If the user's prompt provided a name, use it (correcting tense if needed).
- If the original intent is ambiguous or requires context you do not have, stop without producing a workflow — no low-quality stubs.

### Ending the run (required)

- Every promote run MUST end with exactly one \`report-promote-outcome\` call, as the run's FINAL tool call. It is the promote's completion signal: a run that ends without it is reported to the user as failed without explanation.
- Before reporting success, inspect the saved workflow with \`workflows(action="get-json")\`: any \`<__PLACEHOLDER_VALUE__...__>\` marker in a parameter, or a credential-requiring node left unbound while a matching credential exists, means the build is NOT done — fix the workflow first, researching the real value if needed.
- \`success: true\` plus \`workflowId\` — only when the workflow was saved successfully and works (verification passed where verification was possible). Report the main workflow only, never a supporting workflow.
- \`success: false\` plus a user-readable \`failureReason\` — everything else, including declining an ambiguous request or giving up on a build that will not verify. Say what blocked the build and what would unblock it.
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

/** Resolve the desktop-assistant profile for a run. `deps.memory` lets the
 *  one-shot plan-proposal tool persist the plan on thread metadata; callers
 *  that only read `promptSection` can omit it. */
export function getDesktopAssistantProfile(
	promptMode: DesktopAssistantPromptMode | undefined,
	deps: { memory?: PatchableThreadMemory } = {},
): DesktopAssistantProfile {
	switch (promptMode) {
		case 'desktop-assistant-one-shot':
			return {
				promptSection: ONE_SHOT_PROMPT_SECTION,
				extraTools: [
					createReportDesktopTaskOutcomeTool(),
					createProposeTaskPlanTool({ memory: deps.memory }),
				],
				preloadGatewayTools: true,
				suppressInteractiveSetup: true,
				preApproveWorkflowEdits: false,
			};
		case 'desktop-assistant-promote':
			return {
				promptSection: PROMOTE_PROMPT_SECTION,
				extraTools: [createReportPromoteOutcomeTool({ memory: deps.memory })],
				preloadGatewayTools: false,
				suppressInteractiveSetup: true,
				preApproveWorkflowEdits: false,
			};
		case 'desktop-assistant-edit':
			return {
				promptSection: EDIT_PROMPT_SECTION,
				extraTools: [],
				preloadGatewayTools: false,
				suppressInteractiveSetup: true,
				preApproveWorkflowEdits: true,
			};
		case undefined:
			return {
				promptSection: '',
				extraTools: [],
				preloadGatewayTools: false,
				suppressInteractiveSetup: false,
				preApproveWorkflowEdits: false,
			};
	}
}
