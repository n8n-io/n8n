import { UserError } from 'n8n-workflow';

export class UnrecognizedNodeTypeError extends UserError {
	constructor(packageName: string, nodeType: string) {
		super(`Unrecognized node type: ${packageName}.${nodeType}`);
	}
}
