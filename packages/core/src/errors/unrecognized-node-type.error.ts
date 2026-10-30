import { UserError } from '@n8n/errors';

export class UnrecognizedNodeTypeError extends UserError {
	constructor(packageName: string, nodeType: string) {
		super(`Unrecognized node type: ${packageName}.${nodeType}`);
	}
}
