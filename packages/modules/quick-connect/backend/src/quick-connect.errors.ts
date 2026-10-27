import { OperationalError } from 'n8n-workflow';

/**
 * Error thrown when quick connect fails to fetch credentials from a third-party service.
 */
export class QuickConnectError extends OperationalError {
	constructor(
		message: string,
		readonly credentialType: string,
		cause?: Error,
	) {
		super(message, { cause, extra: { credentialType } });
	}
}
