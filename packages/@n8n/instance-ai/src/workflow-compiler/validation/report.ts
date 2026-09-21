export type VerificationLevel = 'pass' | 'fail' | 'warn' | 'not_run';

export interface ValidationIssue {
	severity: 'error' | 'warning' | 'info';
	code: string;
	message: string;
	nodeName?: string;
	stepId?: string;
	parameter?: string;
}

/**
 * Explicit verification state. "Works" is never one boolean: each level
 * reports separately, and anything that has not run says so.
 */
export interface VerificationReport {
	structural: VerificationLevel;
	parameters: VerificationLevel;
	expressions: VerificationLevel;
	contracts: VerificationLevel;
	crossWorkflow: VerificationLevel;
	fixtureTests: VerificationLevel;
	integrationTests: VerificationLevel;
	publication: VerificationLevel;
	issues: ValidationIssue[];
}

export function emptyVerificationReport(): VerificationReport {
	return {
		structural: 'not_run',
		parameters: 'not_run',
		expressions: 'not_run',
		contracts: 'not_run',
		crossWorkflow: 'not_run',
		fixtureTests: 'not_run',
		integrationTests: 'not_run',
		publication: 'not_run',
		issues: [],
	};
}

export function levelFor(issues: readonly ValidationIssue[]): VerificationLevel {
	if (issues.some((issue) => issue.severity === 'error')) return 'fail';
	if (issues.some((issue) => issue.severity === 'warning')) return 'warn';
	return 'pass';
}

export function hasBlockingIssues(report: VerificationReport): boolean {
	return report.issues.some((issue) => issue.severity === 'error');
}
