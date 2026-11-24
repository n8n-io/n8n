import type { CodeTaskUserError } from '@n8n/code-task-contract';
import { isRecord } from '@n8n/utils/is-record';

/** Max size of a control message, including its newline. The same as in the code daemon. */
export const MAX_CONTROL_MESSAGE_BYTES = 512 * 1024;

/**
 * Cut length of the error fields in a control message. JSON can escape one character
 * to 6 bytes, so two cut fields fit in the max size.
 */
const MAX_CUT_ERROR_FIELD_LENGTH = 32 * 1024;

/** The daemon tells the runtime to run the task that it wrote to `dir`. */
export interface StartMessage {
	type: 'start';
	taskId: string;
	dir: string;
}

export type RuntimeMessage =
	| { type: 'ready' }
	| { type: 'done'; taskId: string }
	| { type: 'error'; taskId: string; error: CodeTaskUserError };

/** Returns `undefined` for a line that is not a valid `start` message. */
export function parseStartMessage(line: string): StartMessage | undefined {
	let message: unknown;
	try {
		message = JSON.parse(line);
	} catch {
		return undefined;
	}

	return isRecord(message) &&
		message.type === 'start' &&
		typeof message.taskId === 'string' &&
		typeof message.dir === 'string'
		? { type: 'start', taskId: message.taskId, dir: message.dir }
		: undefined;
}

function cutText(text: string): string {
	return text.length > MAX_CUT_ERROR_FIELD_LENGTH
		? text.slice(0, MAX_CUT_ERROR_FIELD_LENGTH)
		: text;
}

/** An error that is too large keeps only its main fields, cut to fit. */
export function serializeMessage(message: RuntimeMessage): string {
	const line = `${JSON.stringify(message)}\n`;
	if (message.type !== 'error' || Buffer.byteLength(line) <= MAX_CONTROL_MESSAGE_BYTES) return line;

	// The result file keeps the full error. The runtime checked the types of these fields.
	const { message: text, description, lineNumber, itemIndex } = message.error;
	const error: CodeTaskUserError = {
		message: cutText(text),
		description: typeof description === 'string' ? cutText(description) : description,
		lineNumber,
		itemIndex,
	};

	return `${JSON.stringify({ ...message, error })}\n`;
}
