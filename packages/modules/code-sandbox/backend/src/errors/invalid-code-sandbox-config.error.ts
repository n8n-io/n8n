import { UserError } from '@n8n/errors';

export class InvalidCodeSandboxConfigError extends UserError {
	constructor(problems: string[]) {
		super(['Invalid code sandbox configuration.', ...problems].join(' '));
	}
}
