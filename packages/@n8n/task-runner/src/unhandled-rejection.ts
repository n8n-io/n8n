import { types } from 'node:util';

const MAX_REASON_LENGTH = 1000;
const MAX_NAME_LENGTH = 100;
const MAX_KEY_LENGTH = 100;
const MAX_KEYS = 10;
const MAX_FRAMES = 10;
const MAX_FRAME_LENGTH = 200;
const FRAME_PATTERN = /^\s+at /;
const LOG_PREFIX = 'Unhandled promise rejection in task runner, continuing.';

function describeKind(reason: object): string {
	if (Array.isArray(reason)) return 'Array';
	const ctor: unknown = reason.constructor;
	if (typeof ctor === 'function' && typeof ctor.name === 'string' && ctor.name !== '') {
		return ctor.name;
	}
	return 'Object';
}

function extractFrames(stack: string, header: string): string[] {
	if (!stack.startsWith(header)) return [];
	if (stack.length > header.length && stack[header.length] !== '\n') return [];
	const frames: string[] = [];
	let start = header.length + 1;
	while (start < stack.length && frames.length < MAX_FRAMES) {
		const newline = stack.indexOf('\n', start);
		const end = newline === -1 ? stack.length : newline;
		const line = stack.slice(start, end);
		if (FRAME_PATTERN.test(line)) frames.push(line.slice(0, MAX_FRAME_LENGTH));
		start = end + 1;
	}
	return frames;
}

function describeError(error: Error): string {
	const name = typeof error.name === 'string' ? error.name : 'Error';
	const message: unknown = error.message;
	const stack: unknown = error.stack;
	// The message is never logged, since it can hold request data; it only locates where the frames start.
	const frames =
		typeof stack === 'string' && typeof message === 'string'
			? extractFrames(stack, message === '' ? name : `${name}: ${message}`)
			: [];
	return [name.slice(0, MAX_NAME_LENGTH), ...frames].join('\n');
}

function describeObject(reason: object): string {
	if (types.isNativeError(reason)) return describeError(reason);

	const kind = describeKind(reason);
	// Read only the length: listing every index of a huge array or buffer can exhaust the heap.
	if (Array.isArray(reason)) {
		return `${kind} of length ${reason.length}`;
	}
	if (ArrayBuffer.isView(reason) && 'length' in reason && typeof reason.length === 'number') {
		return `${kind} of length ${reason.length}`;
	}

	const keys = Object.keys(reason);
	const shown = keys.slice(0, MAX_KEYS).map((key) => key.slice(0, MAX_KEY_LENGTH));
	const more = keys.length > MAX_KEYS ? ', ...' : '';
	return `${kind} with keys [${shown.join(', ')}${more}]`;
}

export function describeRejectionReason(reason: unknown): string {
	let text: string;
	if ((typeof reason === 'object' && reason !== null) || typeof reason === 'function') {
		text = describeObject(reason);
	} else if (typeof reason === 'string') {
		text = `string of length ${reason.length}`;
	} else {
		text = String(reason);
	}

	return text.slice(0, MAX_REASON_LENGTH);
}

export function onUnhandledRejection(reason: unknown): void {
	let message: string;
	try {
		// A Proxy or getter on the reason can throw.
		message = `${LOG_PREFIX} Reason: ${describeRejectionReason(reason)}`;
	} catch {
		message = `${LOG_PREFIX} Reason could not be described`;
	}
	console.warn(message);
}
