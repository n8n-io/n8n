import { inspect, types } from 'node:util';

const LOG_PREFIX = 'Unhandled promise rejection in task runner, continuing.';
const MAX_REASON_LENGTH = 1000;

function describeKind(value: object): string {
	if (Array.isArray(value)) return 'Array';
	const ctor: unknown = value.constructor;
	if (typeof ctor === 'function' && typeof ctor.name === 'string' && ctor.name !== '') {
		return ctor.name;
	}
	return 'Object';
}

export function describeRejectionReason(reason: unknown): string {
	let text: string;
	if (types.isNativeError(reason)) {
		text = inspect(reason);
	} else if ((typeof reason === 'object' && reason !== null) || typeof reason === 'function') {
		// Values that are not errors are often item or request data, so only their type is logged.
		text = describeKind(reason);
	} else if (reason === null) {
		text = 'null';
	} else {
		text = typeof reason;
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
