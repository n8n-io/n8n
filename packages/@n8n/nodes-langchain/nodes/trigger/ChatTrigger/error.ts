import { UserError } from '@n8n/errors';

export class ChatTriggerAuthorizationError extends UserError {
	constructor(
		readonly responseCode: number,
		message?: string,
		/** The `WWW-Authenticate` value for the response; the node falls back to its Basic realm. */
		readonly challenge?: string,
	) {
		if (message === undefined) {
			message = 'Authorization problem!';
			if (responseCode === 401) {
				message = 'Authorization is required!';
			} else if (responseCode === 403) {
				message = 'Authorization data is wrong!';
			}
		}
		super(message);
	}
}
