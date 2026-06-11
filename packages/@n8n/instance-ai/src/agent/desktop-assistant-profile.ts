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
 *   a short descriptive workflow name that starts with a single
 *   representative emoji.
 */
export type DesktopAssistantPromptMode = 'desktop-assistant-one-shot' | 'desktop-assistant-promote';

export interface DesktopAssistantProfile {
	/** Section prepended to the system prompt. Empty for regular chat runs. */
	promptSection: string;
	/** Desktop-specific tools to add to the orchestrator's registry. */
	extraTools: BuiltTool[];
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
- After completing the task: call it with \`success: true\`, a short \`title\` (3–8 words, suitable as a workflow name), and a one-sentence \`summary\` of what was done.
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
- First decide how the executed task ran:
  - **Deterministic** — a fixed sequence of device tool calls whose arguments did not depend on inspecting data first or making judgment calls (e.g. "rename report.pdf to banana.txt").
  - **Requires judgment** — each run must look at data and decide what to do (e.g. "organize my downloads folder").
- Deterministic → build: Manual Trigger → one \`@n8n/n8n-nodes-langchain.computerUse\` node per executed device tool call, in order. On each node set the \`tool\` resourceLocator (mode \`id\`) to the exact tool name that was called, set \`inputMode\` to \`json\`, and set \`jsonInput\` to the literal arguments that were used (taken from the tool calls visible in this thread).
- Requires judgment → build: Manual Trigger → AI Agent node with a \`@n8n/n8n-nodes-langchain.toolComputerUse\` node attached as its tool, with the user's original task as the agent's prompt/system message. Use an existing LLM credential for the agent's model if one is available; otherwise leave it unset.
- Both Computer Use node types require a \`deviceConnectionApi\` credential. One is auto-created (named after the user's device) when their device connects — reuse the user's existing Device Connection credential. If none exists, build anyway and leave the credential slot unset.
- When you create the workflow, set its \`name\` to a short descriptive label (3–8 words) that starts with a single emoji representing the workflow's purpose. Examples: \`"🍌 Daily banana prices email"\`, \`"💬 Slack alerts for Stripe refunds"\`, \`"📅 Weekly backup of Notion"\`. If the user's prompt already provided a name, use that name and prepend a fitting emoji.
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
			};
		case 'desktop-assistant-promote':
			return { promptSection: PROMOTE_PROMPT_SECTION, extraTools: [] };
		case undefined:
			return { promptSection: '', extraTools: [] };
	}
}
