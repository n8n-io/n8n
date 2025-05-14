import { UnexpectedError } from 'n8n-workflow';

export class ModuleAlreadyRegisteredError extends UnexpectedError {
	constructor(moduleName: string, className: string) {
		super(
			`Failed to register module "${moduleName}" (${className}) because a module is already registered with this name. Please rename of the modules.`,
		);
	}
}
