import { UserError } from 'n8n-workflow';

export class DisallowedModuleError extends UserError {
	constructor(moduleName: string) {
		super(`Module '${moduleName}' is disallowed`);
	}
}
