import { ResponseError } from './abstract/response.error';

export class LicenseEulaRequiredError extends ResponseError {
	constructor(
		message: string,
		readonly meta: { eulaUrl: string },
	) {
		super(message, 400);
		this.name = 'LicenseEulaRequiredError';
	}
}
