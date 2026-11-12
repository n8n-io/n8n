import { UserError } from 'n8n-workflow';

/** Thrown when another app already uses the namespace of a new app. */
export class AppNamespaceTakenError extends UserError {
	constructor(namespace: string) {
		super(`An app already uses the namespace "${namespace}".`);
	}
}
