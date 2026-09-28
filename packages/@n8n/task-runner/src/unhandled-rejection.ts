import { sanitizeErrorDetail } from '@n8n/utils/redaction/sanitize-error-detail';

const MAX_REASON_LENGTH = 1000;
const MAX_LISTED_KEYS = 10;
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
	if ('stack' in reason && typeof reason.stack === 'string') {
		return reason.stack;
	}

	if ('message' in reason && typeof reason.message === 'string') {
		const name = 'name' in reason && typeof reason.name === 'string' ? reason.name : 'Error';
		return `${name}: ${reason.message}`;
	}

	const keys = Object.keys(reason);
	const listed = keys.slice(0, MAX_LISTED_KEYS).join(', ');
	const more = keys.length > MAX_LISTED_KEYS ? ', ...' : '';
	return `${describeKind(reason)} with keys [${listed}${more}]`;
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
		message = `${LOG_PREFIX} Reason: ${describeRejectionReason(reason)}`;
	} catch {
		message = `${LOG_PREFIX} Reason could not be described`;
	}
	console.warn(message);
}
