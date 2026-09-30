import { types } from 'node:util';

const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_NAME_LENGTH = 100;
const MAX_KEY_LENGTH = 100;
const MAX_KEYS = 10;
const MAX_FRAMES = 10;
const MAX_FRAME_LENGTH = 200;
const FRAME_PATTERN = /^\s+at /;

function describeKind(value: object): string {
	if (Array.isArray(value)) return 'Array';
	const ctor: unknown = value.constructor;
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

function describeObject(value: object): string {
	if (types.isNativeError(value)) return describeError(value);

	const kind = describeKind(value);
	// Read only the length: listing every index of a huge array or buffer can exhaust the heap.
	if (Array.isArray(value)) {
		return `${kind} of length ${value.length}`;
	}
	if (ArrayBuffer.isView(value) && 'length' in value && typeof value.length === 'number') {
		return `${kind} of length ${value.length}`;
	}

	const keys = Object.keys(value);
	const shown = keys.slice(0, MAX_KEYS).map((key) => key.slice(0, MAX_KEY_LENGTH));
	const more = keys.length > MAX_KEYS ? ', ...' : '';
	return `${kind} with keys [${shown.join(', ')}${more}]`;
}

export function describeValue(value: unknown): string {
	let text: string;
	if ((typeof value === 'object' && value !== null) || typeof value === 'function') {
		text = describeObject(value);
	} else if (typeof value === 'string') {
		text = `string of length ${value.length}`;
	} else {
		text = String(value);
	}

	return text.slice(0, MAX_DESCRIPTION_LENGTH);
}
