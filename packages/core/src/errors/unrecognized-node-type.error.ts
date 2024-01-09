import { ApplicationError } from 'n8n-workflow';

export class UnrecognizedNodeTypeError extends ApplicationError {
	severity = 'warning';

	constructor(nodeType: string, nodeVersion?: number) {
		super('Unknown node type or version', {
			extra: {
				nodeType,
				nodeVersion,
			},
		});
	}
}
