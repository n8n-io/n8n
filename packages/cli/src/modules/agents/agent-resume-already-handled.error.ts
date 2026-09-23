import { UserError } from 'n8n-workflow';

/** The checkpoint of a resume is no longer suspended: another resume or a cancel handled it. */
export class AgentResumeAlreadyHandledError extends UserError {
	constructor() {
		super('This action has already been handled');
	}
}
