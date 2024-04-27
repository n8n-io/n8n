import { ApplicationError } from 'n8n-workflow';

export class DuplicateHookError extends ApplicationError {
	constructor(hookName: 'beforeEachTask' | 'afterEachTask', key: string) {
		super(
			`Duplicate \`${hookName}\` hook found at \`${key}\`. Please define a single \`${hookName}\` hook for this file.`,
			{ level: 'warning' },
		);
	}
}
