import { ApplicationError } from 'n8n-workflow';

export class PortTakenError extends ApplicationError {
	constructor(port: number) {
		super(
			`Port ${port} is already in use. Do you already have the n8n main process running on that port?`,
		);
	}
}
