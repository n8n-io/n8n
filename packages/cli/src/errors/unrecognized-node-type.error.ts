import { ApplicationError } from 'n8n-workflow';

export class UnrecognizedNodeTypeError extends ApplicationError {
	severity = 'warning';

	constructor(nodeType: string) {
		super(`Unrecognized node type: ${nodeType}".`);
	}
}
