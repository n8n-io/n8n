import { ApplicationError } from 'n8n-workflow';

export class UnrecognizedNodeTypeError extends ApplicationError {
	severity = 'warning';

	constructor(packageName: string, nodeType: string) {
		super(`Unrecognized node type: ${packageName}.${nodeType}`);
	}
}
