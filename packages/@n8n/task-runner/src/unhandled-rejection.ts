import { describeValue } from '@n8n/utils/describe-value';

const LOG_PREFIX = 'Unhandled promise rejection in task runner, continuing.';

export function onUnhandledRejection(reason: unknown): void {
	let message: string;
	try {
		// A Proxy or getter on the reason can throw.
		message = `${LOG_PREFIX} Reason: ${describeValue(reason)}`;
	} catch {
		message = `${LOG_PREFIX} Reason could not be described`;
	}
	console.warn(message);
}
