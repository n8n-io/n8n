import { ApplicationError } from 'n8n-workflow';

export class MalformedRefreshValueError extends ApplicationError {
	constructor() {
		super('Refresh value must have the same number of values as keys');
	}
}
