import {
	instanceAiAgentPreviewHandoffContextSchema,
	instanceAiResourceAttachmentSchema,
	type InstanceAiAgentPreviewHandoffContext,
	type InstanceAiResourceAttachment,
} from '@n8n/api-types';
import { jsonParse } from 'n8n-workflow';
import { z } from 'zod';

/**
 * Protocol for internal messages injected by the service layer.
 *
 * The service may prepend a transient task-status block to real user messages
 * so the orchestrator can reference currently running detached tasks. These
 * are LLM-facing only — they must never reach the UI.
 *
 * The service writes this format,
 * the parser reads it (cleanStoredUserMessage).
 */

export const AUTO_FOLLOW_UP_MESSAGE = '(continue)';

/**
 * Wraps the editor hand-off context (a workflow the user opened Instance AI
 * about). LLM-facing prose for the agent plus a leading JSON line carrying the
 * structured attachments, so the parser can rebuild `message.attachments` on
 * reload. Stripped from the visible message by `cleanStoredUserMessage`.
 */
export const EDITOR_CONTEXT_OPEN_TAG = '<editor-context>';
export const EDITOR_CONTEXT_CLOSE_TAG = '</editor-context>';
export const CREDENTIAL_CONTEXT_OPEN_TAG = '<credential-context>';
export const CREDENTIAL_CONTEXT_CLOSE_TAG = '</credential-context>';
export const AGENT_PREVIEW_CONTEXT_OPEN_TAG = '<agent-preview-context>';
export const AGENT_PREVIEW_CONTEXT_CLOSE_TAG = '</agent-preview-context>';

/**
 * Wraps what is going on in this instance — what exists here, what changed lately, and what has
 * run — so the agent can read the user's intent against it.
 *
 * On the turn rather than in the system prompt, and not negotiable: `getSystemPrompt()` is one
 * shared prompt-cache entry across every thread on the instance, which is why the clock and the
 * project name ride the turn too. A per-user block in the cached prefix would invalidate it for
 * every user on every turn.
 *
 * LLM-facing only, and carries no structured payload to rebuild: the block is re-derivable, so on
 * reload it is simply dropped.
 */
export const INSTANCE_CONTEXT_OPEN_TAG = '<instance-context>';
export const INSTANCE_CONTEXT_CLOSE_TAG = '</instance-context>';
export const PROJECT_CONTEXT_OPEN_TAG = '<project-context>';
export const PROJECT_CONTEXT_CLOSE_TAG = '</project-context>';

/**
 * Matches internal task-context prefix blocks injected by the service. The
 * block is followed by `\n\n` and the user's text, or ends the message when
 * the user sent no text of their own (e.g. an editor hand-off whose only
 * content is the workflow context).
 */
const TASK_CONTEXT_BLOCK =
	/^(?:<running-tasks>\n[\s\S]*?\n<\/running-tasks>|<planned-task-follow-up[\s\S]*?\n<\/planned-task-follow-up>|<planning-blueprint>\n[\s\S]*?\n<\/planning-blueprint>|<background-task-completed>\n[\s\S]*?\n<\/background-task-completed>|<workflow-verification-follow-up>\n[\s\S]*?\n<\/workflow-verification-follow-up>|<workflow-setup-required>\n[\s\S]*?\n<\/workflow-setup-required>|<editor-context>\n[\s\S]*?\n<\/editor-context>|<credential-context>\n[\s\S]*?\n<\/credential-context>|<agent-preview-context>\n[\s\S]*?\n<\/agent-preview-context>|<instance-context>\n[\s\S]*?\n<\/instance-context>)(?:\n\n|$)/;

/** Captures the leading JSON line inside an editor-context block. */
const EDITOR_CONTEXT_JSON = /^<editor-context>\n(\[[\s\S]*?\])\n/;

/** Captures the leading JSON line inside an agent-preview-context block. */
const AGENT_PREVIEW_CONTEXT_JSON = /^<agent-preview-context>\n(\{[\s\S]*?\})\n/;

/** Match the final opening tag so user-authored lookalikes earlier in the message stay visible. */
const CURRENT_DATE_TIME_BLOCK =
	/\n*<current-date-time>(?:(?!<current-date-time>)[\s\S])*?<\/current-date-time>\s*$/;

/** Same shape as the clock block, for the same reason — see `withProjectContext`. */
const PROJECT_CONTEXT_BLOCK =
	/\n*<project-context>(?:(?!<project-context>)[\s\S])*?<\/project-context>\s*$/;

/** Every trailing block the service appends. */
const TRAILING_CONTEXT_BLOCKS = [CURRENT_DATE_TIME_BLOCK, PROJECT_CONTEXT_BLOCK];

/** Strip each trailing block once, in whatever order they were composed. */
function stripTrailingContextBlocks(message: string): string {
	let text = message;
	const unstripped = new Set(TRAILING_CONTEXT_BLOCKS);
	let stripped: boolean;
	do {
		stripped = false;
		for (const block of unstripped) {
			const next = text.replace(block, '');
			if (next === text) continue;
			text = next;
			unstripped.delete(block);
			stripped = true;
			break;
		}
	} while (stripped);
	return text;
}

/**
 * Append the per-turn clock as a tagged suffix the parser strips before display.
 * On the turn rather than in the system prompt for prompt-caching reasons.
 * */
export function withCurrentDateTime(message: string, dateTimeSection: string): string {
	return `${message}\n\n<current-date-time>${dateTimeSection}\n</current-date-time>`;
}

/**
 * Name the project this conversation is scoped to.
 * On the turn rather than in the system prompt for prompt-caching reasons.
 */
export function withProjectContext(message: string, projectSection: string): string {
	return `${message}\n\n<project-context>\n${projectSection}\n</project-context>`;
}

/** The fact, and only the fact. The rule that follows from it ("writes are locked to
 *  this project", "check it before you build") lives in the system prompt, which is
 *  CACHED — restating it here would pay for the same sentence in uncached tokens on
 *  every turn of every conversation. Measured: the fact alone is enough. */
export function getProjectContextSection(project: { name: string; type: string }): string {
	return `This conversation is scoped to the project "${project.name}" (${project.type}).`;
}

/**
 * Recover the original user text from a stored message that may contain
 * internal enrichment. Returns `null` for auto-follow-up messages that
 * should be hidden from the UI entirely.
 */
export function cleanStoredUserMessage(stored: string): string | null {
	// The service can stack several internal blocks (e.g. an editor-context block
	// ahead of a running-tasks-enriched message), so strip every leading block —
	// not just the first — or the trailing ones leak into the visible message.
	let text = stripTrailingContextBlocks(stored);
	let previous: string;
	do {
		previous = text;
		text = text.replace(TASK_CONTEXT_BLOCK, '');
	} while (text !== previous);
	return text === AUTO_FOLLOW_UP_MESSAGE ? null : text;
}

/**
 * Reconstructs the resource attachments (workflows, agents) the editor hand-off
 * encoded in a stored user message, so the UI can re-surface them as artifacts
 * after a reload. Returns an empty array when the message carries no editor
 * context.
 */
export function extractEditorContextResourceAttachments(
	stored: string,
): InstanceAiResourceAttachment[] {
	const match = EDITOR_CONTEXT_JSON.exec(stored);
	if (!match) return [];
	const parsed = z
		.array(instanceAiResourceAttachmentSchema)
		.safeParse(jsonParse(match[1], { fallbackValue: undefined }));
	return parsed.success ? parsed.data : [];
}

/**
 * Reconstructs the agent-preview handoff context encoded in a stored user
 * message so the UI can re-surface it (chip) after a reload.
 */
export function extractAgentPreviewHandoffContext(
	stored: string,
): InstanceAiAgentPreviewHandoffContext | undefined {
	const match = AGENT_PREVIEW_CONTEXT_JSON.exec(stored);
	if (!match) return undefined;
	const parsed = instanceAiAgentPreviewHandoffContextSchema.safeParse(
		jsonParse(match[1], { fallbackValue: undefined }),
	);
	return parsed.success ? parsed.data : undefined;
}
