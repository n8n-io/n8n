import { OperationalError } from '@n8n/errors';

/** The publisher of a workflow version could not be read. The lookup can be retried. */
export class PublisherLookupError extends OperationalError {
	constructor(workflowId: string, cause: unknown) {
		super('Failed to read the publisher of the workflow version', {
			cause,
			extra: { workflowId },
		});
	}
}
