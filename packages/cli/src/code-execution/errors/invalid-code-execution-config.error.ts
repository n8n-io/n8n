import { UserError } from '@n8n/errors';

export class InvalidCodeExecutionConfigError extends UserError {
	constructor(problems: string[]) {
		super(['Invalid code execution configuration.', ...problems].join(' '));
	}
}
