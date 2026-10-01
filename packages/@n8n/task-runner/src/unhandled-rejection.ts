import { types } from 'node:util';

const LOG_PREFIX = 'Unhandled promise rejection in task runner, continuing.';
const MAX_REASON_LENGTH = 1000;
const MAX_KEY_LENGTH = 100;
const MAX_KEYS = 10;

function describeKind(value: object): string {
	if (Array.isArray(value)) return 'Array';
	const ctor: unknown = value.constructor;
	if (typeof ctor === 'function' && typeof ctor.name === 'string' && ctor.name !== '') {
		return ctor.name;
	}
	return 'Object';
}

function describeError(error: Error): string {
	const stack: unknown = error.stack;
	if (typeof stack === 'string') return stack;
	const name: unknown = error.name;
	const message: unknown = error.message;
	return `${typeof name === 'string' ? name : 'Error'}: ${typeof message === 'string' ? message : ''}`;
}

// Values that are not errors are often item or request data, so only their shape is logged.
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
