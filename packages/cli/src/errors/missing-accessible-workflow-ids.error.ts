import { ApplicationError } from 'n8n-workflow';

export class MissingAccessibleWorkflowIdsError extends ApplicationError {
	constructor(query: object) {
		super('Missing accessible workflow IDs in query to retrieve many executions', {
			extra: { query },
		});
	}
}
