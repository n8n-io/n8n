import {
	instanceAiWorkflowAttachmentSchema,
	type InstanceAiWorkflowAttachment,
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

/**
 * Matches internal task-context prefix blocks injected by the service. The
 * block is followed by `\n\n` and the user's text, or ends the message when
 * the user sent no text of their own (e.g. an editor hand-off whose only
 * content is the workflow context).
 */
const TASK_CONTEXT_BLOCK =
	/^(?:<running-tasks>\n[\s\S]*?\n<\/running-tasks>|<planned-task-follow-up[\s\S]*?\n<\/planned-task-follow-up>|<planning-blueprint>\n[\s\S]*?\n<\/planning-blueprint>|<background-task-completed>\n[\s\S]*?\n<\/background-task-completed>|<workflow-verification-follow-up>\n[\s\S]*?\n<\/workflow-verification-follow-up>|<workflow-setup-required>\n[\s\S]*?\n<\/workflow-setup-required>|<editor-context>\n[\s\S]*?\n<\/editor-context>)(?:\n\n|$)/;

/** Captures the leading JSON line inside an editor-context block. */
const EDITOR_CONTEXT_JSON = /^<editor-context>\n(\[[\s\S]*?\])\n/;

/** Matches the per-turn date/time block the service appends to the user message. */
const CURRENT_DATE_TIME_BLOCK = /\n*<current-date-time>[\s\S]*?<\/current-date-time>\s*$/;

/** Append the per-turn clock as a tagged suffix the parser strips before display. */
export function withCurrentDateTime(message: string, dateTimeSection: string): string {
	return `${message}\n\n<current-date-time>${dateTimeSection}\n</current-date-time>`;
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
	let text = stored.replace(CURRENT_DATE_TIME_BLOCK, '');
	let previous: string;
	do {
		previous = text;
		text = text.replace(TASK_CONTEXT_BLOCK, '');
	} while (text !== previous);
	return text === AUTO_FOLLOW_UP_MESSAGE ? null : text;
}

/**
 * Reconstructs the workflow attachments the editor hand-off encoded in a stored
 * user message, so the UI can re-surface them as artifacts after a reload.
 * Returns an empty array when the message carries no editor context.
 */
export function extractEditorContextWorkflowAttachments(
	stored: string,
): InstanceAiWorkflowAttachment[] {
	const match = EDITOR_CONTEXT_JSON.exec(stored);
	if (!match) return [];
	const parsed = z
		.array(instanceAiWorkflowAttachmentSchema)
		.safeParse(jsonParse(match[1], { fallbackValue: undefined }));
	return parsed.success ? parsed.data : [];
}
