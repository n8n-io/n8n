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
 */
export type DesktopAssistantPromptMode = 'desktop-assistant-one-shot' | 'desktop-assistant-promote';

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
const FIRE_AND_FORGET_RULES = `This run is fire-and-forget from the n8n desktop assistant. The user never sees any text you write — only tool calls and the run lifecycle reach the UI. Output tool calls only: no greetings, narration, progress commentary, or summaries, and no follow-up questions (the user cannot answer them). If you want to explain what you're about to do, just do it instead.`;

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

${FIRE_AND_FORGET_RULES}

### Procedure

This thread contains a task you already executed via device (computer-use) tool calls. Build exactly one workflow (via the workflow-builder skill) that fulfils the user's request every time it runs — **the request, not the artifacts of this particular run**. Follow these steps in order:

1. **Classify before building.** Look at every value in the recorded tool arguments and ask where it came from. Values the user specified (or that follow mechanically from the request) are safe to replay literally. Content **you authored** because the request only named a *kind* of content is not — a future run must generate it fresh.
2. **Output your verdict** as a single line of text immediately before building — \`replay: exact\` or \`replay: generate-fresh\`, plus a one-clause reason. This is the only text you may output; it forces the classification to happen.
3. **Build the matching shape:**
   - \`replay: exact\` → Manual Trigger → one \`@n8n/n8n-nodes-langchain.computerUse\` node per recorded call, in order — \`tool\` resourceLocator (mode \`id\`) set to the tool name that was called, \`inputMode: json\`, \`jsonInput\` set to the literal arguments used.
   - \`replay: generate-fresh\` → Manual Trigger → AI Agent node (prompted with the user's task) with \`@n8n/n8n-nodes-langchain.toolComputerUse\` attached as its tool, plus a chat model sub-node wired to one of the user's existing LLM credentials (attach it with the credential unset if they have none).

Examples of the classification: "create a folder called Receipts on my desktop" — fully specified by the request; \`replay: exact\`. "Add an inspiring quote to my notes" — the request names a *kind* of content, not the content itself; \`replay: generate-fresh\`. "Write me a short bio and save it" — authored once as a fixed artifact the user keeps; \`replay: exact\` is fine.

Additional rules:

- **There is no credential-setup step after this build** — the workflow must be runnable exactly as saved. List the user's credentials (\`credentials(action="list")\`) and bind a concrete existing credential on every node that needs one, using \`newCredential('Name', 'id')\` with the real id — never the id-less form, which defers to a setup phase this surface does not have. When several credentials match, pick the most plausible one rather than leaving the node unbound. Only leave a credential unset when the user has none of a matching type.
- Computer Use nodes take the user's existing \`deviceConnectionApi\` credential; leave it unset if none exists.
- Set the workflow \`name\` to a short plain-text label naming the task, not the run: 3–8 words, present tense (\`"Archive old downloads"\`), never a past-tense report (\`"Archived 12 files"\`). If the user's prompt provided a name, use it (correcting tense if needed).
- If the original intent is ambiguous or requires context you do not have, stop without producing a workflow — no low-quality stubs.
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
		case undefined:
			return { promptSection: '', extraTools: [], preloadGatewayTools: false };
	}
}
