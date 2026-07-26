export type LintTarget = 'sdk' | 'jsCode' | 'pythonCode';

export interface SourceLintIssue {
	code: string;
	message: string;
	line?: number;
	severity: 'error' | 'warning';
	lintTarget: LintTarget;
	/** Set when the issue comes from an embedded Code node snippet in SDK source. */
	nodeName?: string;
	parameterPath?: 'jsCode' | 'pythonCode';
}
