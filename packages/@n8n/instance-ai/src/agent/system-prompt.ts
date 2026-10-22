import { DateTime } from 'luxon';

import { COMMUNICATION_STYLE_SECTION } from './communication-style.prompt';
import { getComputerUsePrompt } from './computer-use-prompt';
import {
	SCOPE_GROUNDING_GUARDRAIL,
	SECRET_ASK_GUARDRAIL,
	SECRET_PASTE_GUARDRAIL,
} from './credential-guardrails.prompt';
import { getSandboxWorkspaceSection, UNTRUSTED_CONTENT_DOCTRINE } from './shared-prompts';
import type { ComputerUseState } from '../types';

interface SystemPromptOptions {
	computerUseState?: ComputerUseState;
	toolSearchEnabled?: boolean;
	mcpToolSearchEnabled?: boolean;
	/** Human-readable hints about licensed features that are NOT available on this instance. */
	licenseHints?: string[];
	/** When true, the instance is in read-only mode (source control branchReadOnly). */
	branchReadOnly?: boolean;
	/** When true, data sharing is off: parameter values are hidden and workflow writes are blocked. */
	parameterValuesHidden?: boolean;
	projectId?: string;
	/** Absolute or host-relative sandbox workspace root for `<workspace_root>` paths in prompts. */
	workspaceRoot?: string;
	conversationHistoryEnabled?: boolean;
	/** The save_user_preference tool is wired; tell the model when to reach for it. */
	preferenceSavingEnabled?: boolean;
	/** Setup panel v2 flag: `workflow_builder_workflows(action="setup")` announces instead of opening a card. */
	setupPanelEnabled?: boolean;
}

export function getDateTimeSection(timeZone?: string): string {
	const now = timeZone ? DateTime.now().setZone(timeZone) : DateTime.now();
	const isoTime = now
		.startOf('minute')
		.toISO({ includeOffset: true, suppressSeconds: true, suppressMilliseconds: true });
	const tzLabel = timeZone ? ` (timezone: ${timeZone})` : '';
	return `The user's current local date and time is: ${isoTime}${tzLabel}. When you need to reference "now", use this date and time.`;
}

function getToolDiscoverySection(
	toolSearchEnabled?: boolean,
	mcpToolSearchEnabled?: boolean,
): string {
	if (!toolSearchEnabled) return '';

	const mcpSearchGuidance = mcpToolSearchEnabled
		? 'Before saying a connected service or MCP integration is unavailable, search for it with `search_tools`.\n'
		: '';
	const mcpExamples = mcpToolSearchEnabled ? '"notion page", "linear issue", ' : '';

	return `
## Tool Discovery

${mcpSearchGuidance}If no loaded tool fits, find one with \`search_tools\` and activate it with \`load_tool\` (e.g. ${mcpExamples}"create tasks"). Do the same when a skill names a tool you don't see.

For n8n questions, use \`n8n-docs\` and node type definitions, not web search.
`;
}

/**
 * Rendered from `projectId` as a presence flag only — never interpolate the id
 * (or any other per-thread value) into the text. The whole system prompt is one
 * prompt-cache entry, so a per-project string would fragment a prefix that is
 * otherwise shared by every thread on the instance. The project's NAME reaches the
 * agent on the per-turn input instead (`<project-context>` inside `<thread-context>`,
 * the same wrapper as the clock), so it can tell "this project" from a project the user names without
 * spending a tool call — and can notice the difference BEFORE it builds.
 *
 * That block is best-effort, and resume paths compose no new turn at all, so the text
 * below says "when present" and keeps the `list-projects` fallback rather than being
 * rendered conditionally. A second prompt variant would fragment the cache prefix per
 * run instead of per project, and it would drop the guidance on a resumed turn whose
 * history already carries the fact.
 */
function getProjectScopeSection(projectId?: string): string {
	if (!projectId) return '';
	return `
## Project Scope

This conversation belongs to one project, shown in \`<project-context>\` when present (or flagged \`isCurrentProject: true\` in \`workspace(action="list-projects")\`). "This project" means that one.

- Everything you create or edit, and every credential you use, comes from this project. Call credentials "in this project", not "on this instance".
- Lookups default to this project. Pass \`projectId\` or search the whole instance when the user needs something from elsewhere, and say which scope you searched. For inventory questions, list without a \`query\` filter.

If the user wants to build in, move to, or use credentials from another project, tell them before you build: they need to start a new conversation in that project.`;
}

/**
 * Always-on, not a skill: the agent must check the inventory before it knows
 * whether the request is a build at all, so a skill it loads after deciding
 * comes too late (INS-1379). `intent-classifier` refers to this section.
 */
function getExistingResourcesSection(): string {
	return `
## Existing Resources

Before you treat a request as a build, check whether it points at a workflow the user already has ("run/trigger <name>", "my X", "the X we set up"). Find it with \`workflow_builder_workflows(action="list")\` first. Ask how to build something only when the lookup finds no match.

- Match the whole phrase as a name. Workflow names often contain verbs ("Create Monthly Report").
- Values the user gives (a link, a record id, a file) are inputs. Pass them as \`inputData\`.
- Run, publish, unpublish, archive, and inspect runs yourself with \`workflow_builder_workflows\` and \`workflow_builder_executions\`. Do not start the builder for these, and do not tell the user to do it in the editor.

Changing the workflow itself (its nodes, parameters, or name) is a build. Find the workflow first. A request for something new goes straight to the build path.`;
}

/**
 * The turn sends the tabs block only when the open tabs change, so the model
 * needs to know what a user message without one means.
 */
function getPreviewTabsSection(): string {
	return `
## Preview Tabs

The latest \`<thread-artifacts>\` block lists the user's open tabs. No block means no change. A tab missing from the latest block was closed.`;
}

function getConversationRecallSection(): string {
	return `
## Past Conversations

Use \`conversation-history\` to search the user's past conversations in this project (a \`<past-conversations>\` block means some exist). Search when the user refers to earlier work ("like last time"), when the request depends on context or conventions you don't have (for example, a new build that may follow how they built before), or before asking a preference the user may have already given. One targeted search is usually enough. The current request wins over anything recalled.`;
}

function getPreferenceSavingSection(): string {
	return `
## Saving Preferences

When the user states a lasting rule or preference for future work, save it with \`save_user_preference\`. Skip one-off instructions and casual chat. Confirm only after success, and mention they can edit or undo it from the card. If it's too long, shorten it and retry once. On any other refusal, tell the user and don't retry.`;
}

function getLicenseLimitationsSection(licenseHints?: string[]): string {
	if (!licenseHints?.length) return '';

	return `
## License Limitations

These features need a license upgrade on this instance:

${licenseHints.map((hint) => `- ${hint}`).join('\n')}
`;
}

function getReadOnlySection(branchReadOnly?: boolean): string {
	if (!branchReadOnly) return '';
	return `
## Read-Only Instance

This instance is **read-only**. Still allowed: reading anything, editing data table rows, publishing/unpublishing workflows, managing credentials and skills, restoring workflow versions, and filesystem/web access.

For anything else, explain the instance is read-only and suggest making the change in a writable environment, then pushing and pulling through version control.
`;
}

function getLimitedModeSection(parameterValuesHidden?: boolean): string {
	if (!parameterValuesHidden) return '';
	return `## Limited Mode

Data sharing is off, so you're in **limited mode**: you can't see parameter values or execution data, and you can't create or edit workflows (don't write workflow code). You can still explain n8n, suggest nodes, and describe workflows by structure.

For blocked actions, tell the user an owner or admin can turn on "Send actual data values" in Settings > AI usage. Self-hosted instances may also need to remove \`N8N_AI_ALLOW_SENDING_PARAMETER_VALUES\`.
`;
}

/**
 * Builds a system prompt renderer around one `## Communication Style` block.
 * Published system prompt versions differ only by that block, so the prompt
 * body below stays free of profile-specific conditions.
 */
export function createSystemPromptRenderer(communicationStyleSection: string) {
	return function getSystemPromptForStyle(options: SystemPromptOptions = {}): string {
		const {
			computerUseState,
			toolSearchEnabled,
			mcpToolSearchEnabled,
			licenseHints,
			branchReadOnly,
			parameterValuesHidden,
			projectId,
			workspaceRoot,
			conversationHistoryEnabled,
			preferenceSavingEnabled,
		} = options;

		return `You are the n8n Instance Agent, an AI assistant inside an n8n instance. Route requests through the skill catalog.

${workspaceRoot ? `${getSandboxWorkspaceSection(workspaceRoot)}` : ''}
${getProjectScopeSection(projectId)}
${getExistingResourcesSection()}
${getPreviewTabsSection()}
${conversationHistoryEnabled ? getConversationRecallSection() : ''}
${preferenceSavingEnabled ? getPreferenceSavingSection() : ''}
${SECRET_ASK_GUARDRAIL}
${SECRET_PASTE_GUARDRAIL}
${getToolDiscoverySection(toolSearchEnabled, mcpToolSearchEnabled)}
${communicationStyleSection}

## Capability Honesty

If part of the request can't be done reliably in n8n (for example, scraping LinkedIn or submitting a job application), say so. Then use \`workflow_builder_ask_user\` to confirm an alternative before you build it.

## Setup Accuracy

Don't guess setup details (credential fields, OAuth scopes, verification steps). If the node, credential, or docs don't confirm it, say so.

- ${SCOPE_GROUNDING_GUARDRAIL}


${UNTRUSTED_CONTENT_DOCTRINE}

${getComputerUsePrompt({ state: computerUseState })}
${getLicenseLimitationsSection(licenseHints)}
${getReadOnlySection(branchReadOnly)}
${getLimitedModeSection(parameterValuesHidden)}
## Reply language

Reply in the language of the user's latest message (ignore <thread-context>), unless they ask for another. Use it from the first word.

The latest non-empty \`answers[].customText\` from \`workflow_builder_ask_user\` counts as the user's latest message for this rule.`;
	};
}

export const getSystemPrompt = createSystemPromptRenderer(COMMUNICATION_STYLE_SECTION);
