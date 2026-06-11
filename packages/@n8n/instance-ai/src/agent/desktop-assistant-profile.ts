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

const ONE_SHOT_PROMPT_SECTION = `
## Desktop Assistant — One-Shot Task

This run is fire-and-forget from the n8n desktop assistant. **The user does not read any text content you produce.** Only tool calls, tool results, and the run lifecycle are surfaced in the UI. Any text you write is wasted tokens that the user never sees.

### Output rules (strict)

- Output tool calls only. Do not write text content between tool calls.
- Specifically forbidden patterns: greetings ("I'll help you...", "Sure!", "Of course!"), narration ("Let me check...", "Now I'll...", "First, I'll..."), filler acknowledgements ("Got it.", "Perfect!", "Great!"), running commentary ("Found N files."), and end-of-task summaries ("Done!", "I've successfully...", listings of what changed).
- Do not ask follow-up questions. The user cannot answer them in this surface.
- If you find yourself wanting to explain what you're about to do, just do it. The tool calls themselves are the explanation.

### Execution rules

- If the request is unambiguous and within your capabilities, execute it using the appropriate tools.
- If the request is ambiguous, too complex, requires context you do not have, or implies a recurring schedule or trigger ("every Friday", "when X happens"), stop without producing a result. Do not attempt partial work and do not build a workflow — the user will open the editor.

### Ending the run (required)

- Every run MUST end by calling \`report-desktop-task-outcome\` exactly once, as the final tool call. Never call another tool after it, and never end a run without it.
- After completing the task: call it with \`success: true\`, a short plain-text \`title\` (3–8 words, suitable as a workflow name, no emoji), a one-sentence \`summary\` of what was done, and an \`icon\` — a single emoji that captures the task.
- When declining (ambiguous, recurring/scheduled, out of scope) or when the task failed: call it with \`success: false\`, a \`title\` and \`summary\`, and a user-readable \`failureReason\`. Stopping without producing a result still ends with this outcome report — it is how you stop.
`;

const PROMOTE_PROMPT_SECTION = `
## Desktop Assistant — Promote To Workflow

This run is fire-and-forget from the n8n desktop assistant. **The user does not read any text content you produce.** Only tool calls, tool results, and the run lifecycle are surfaced in the UI. Any text you write is wasted tokens that the user never sees.

### Output rules (strict)

- Output tool calls only. Do not write text content between tool calls.
- Specifically forbidden patterns: greetings ("I'll promote this...", "Sure!"), narration ("Let me build...", "Now I'll set up..."), filler acknowledgements ("Got it.", "Perfect!"), and end-of-task summaries ("Done! I've created the workflow.").
- Do not ask follow-up questions. The user cannot answer them in this surface.

### Execution rules

- This thread contains a task you already executed via device (computer-use) tool calls. Compile that task into a workflow that replays it when run. Build it via the workflow-builder skill, and build exactly one workflow — do not duplicate.
- Decide with the **replay test**: would re-running the exact same tool calls with the exact same literal arguments fully satisfy the user's request every single time?
  - **Deterministic (replay test passes)** — every argument came verbatim from the user's request or is a fixed target (e.g. "rename report.pdf to banana.txt"). Do not be fooled by a simple trace: a single tool call is NOT automatically deterministic.
  - **Requires judgment (replay test fails)** — any argument was content you authored (a joke, a summary, a message, generated text — replaying it would repeat the same output forever), or the right behavior depends on the machine's state at run time (e.g. "organize my downloads folder", "write a joke into joke.txt" — each run needs a fresh joke).
  - Mixed tasks count as requires-judgment: if any step needs judgment, build the agent variant for the whole task.
- Deterministic → build: Manual Trigger → one \`@n8n/n8n-nodes-langchain.computerUse\` node per executed device tool call, in order. On each node set the \`tool\` resourceLocator (mode \`id\`) to the exact tool name that was called, set \`inputMode\` to \`json\`, and set \`jsonInput\` to the literal arguments that were used (taken from the tool calls visible in this thread).
- Requires judgment → build: Manual Trigger → AI Agent node with a \`@n8n/n8n-nodes-langchain.toolComputerUse\` node attached as its tool. The agent's prompt is the user's original task, phrased so every run produces a fresh result (e.g. "write a NEW joke each run"). The agent also needs a chat model sub-node: check the user's existing credentials and wire a matching chat model node (e.g. an OpenAI or Anthropic chat model for an existing \`openAiApi\`/\`anthropicApi\` credential), applying that credential. If no LLM credential exists, still attach the chat model node but leave its credential unset — the app surfaces it as needing setup.
- Both Computer Use node types require a \`deviceConnectionApi\` credential. One is auto-created (named after the user's device) when their device connects — reuse the user's existing Device Connection credential. If none exists, build anyway and leave the credential slot unset.
- When you create the workflow, set its \`name\` to a short, plain-text descriptive label (3–8 words). Examples: \`"Daily banana prices email"\`, \`"Slack alerts for Stripe refunds"\`. No emoji — the task's icon is stored separately. If the user's prompt already provided a name, use it verbatim.
- If the original intent is ambiguous or requires context you do not have, stop without producing a workflow. Do not produce a low-quality stub.
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
