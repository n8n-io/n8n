import { UserError } from '@n8n/errors';

/** Thrown when other apps already use the namespace of a new app and every numbered alternative. */
export class AppNamespaceTakenError extends UserError {
	constructor(namespace: string) {
		super(`An app already uses the namespace "${namespace}".`);
	}
}
