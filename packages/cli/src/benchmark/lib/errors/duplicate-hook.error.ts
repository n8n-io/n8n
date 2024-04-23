import { ApplicationError } from 'n8n-workflow';

export class DuplicateHookError extends ApplicationError {
	constructor(hookName: 'beforeEach' | 'afterEach', filePath: string) {
		super(
			`Duplicate \`${hookName}\` hook found in benchmarking suite \`${filePath}\`. Please define a single \`${hookName}\` hook for this suite.`,
			{ level: 'warning' },
		);
	}
}
