import { sanitizeErrorDetail } from '@n8n/utils/redaction/sanitize-error-detail';

const MAX_REASON_LENGTH = 1000;
const LOG_PREFIX = 'Unhandled promise rejection in task runner, continuing.';

function describeKind(reason: object): string {
	if (Array.isArray(reason)) return 'Array';
	const ctor: unknown = reason.constructor;
	if (typeof ctor === 'function' && typeof ctor.name === 'string' && ctor.name !== '') {
		return ctor.name;
	}
	return 'Object';
}

function describeObject(reason: object): string {
	// Duck-typed, since an error from the vm sandbox fails `instanceof Error`.
	if ('stack' in reason && typeof reason.stack === 'string') {
		return reason.stack;
	}

	if ('message' in reason && typeof reason.message === 'string') {
		const name = 'name' in reason && typeof reason.name === 'string' ? reason.name : 'Error';
		return `${name}: ${reason.message}`;
	}

	const kind = describeKind(reason);
	// Read only the length: listing every index of a huge array or buffer can exhaust the heap.
	if (Array.isArray(reason)) {
		return `${kind} of length ${reason.length}`;
	}
	if (ArrayBuffer.isView(reason) && 'length' in reason && typeof reason.length === 'number') {
		return `${kind} of length ${reason.length}`;
	}
	return kind;
}

export function describeRejectionReason(reason: unknown): string {
	const text =
		(typeof reason === 'object' && reason !== null) || typeof reason === 'function'
			? describeObject(reason)
			: String(reason);

	return sanitizeErrorDetail(text, MAX_REASON_LENGTH);
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
