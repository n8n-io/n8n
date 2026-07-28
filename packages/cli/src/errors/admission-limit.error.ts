import { OperationalError } from 'n8n-workflow';

export class AdmissionLimitError extends OperationalError {
	constructor() {
		super('Too many pending onReceived executions');
	}
}
