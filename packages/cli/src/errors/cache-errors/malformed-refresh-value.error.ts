import { UnexpectedError } from 'n8n-workflow';

export class MalformedRefreshValueError extends UnexpectedError {
	constructor() {
		super('Refresh value must have the same number of values as keys');
	}
}
