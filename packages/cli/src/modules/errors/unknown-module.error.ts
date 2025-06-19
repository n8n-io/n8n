import { UnexpectedError } from 'n8n-workflow';

export class UnknownModuleError extends UnexpectedError {
	constructor(moduleName: string) {
		super(`Unknown module "${moduleName}"`, { level: 'fatal' });
	}
}
