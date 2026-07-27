export type LintTarget = 'sdk' | 'jsCode' | 'pythonCode';

/**
 * Source-lint finding. Severity for CLI exit / build-workflow save is derived
 * from `INFORMATIONAL_VALIDATION_CODES` — do not carry a separate severity here.
 */
export interface SourceLintIssue {
	code: string;
	message: string;
	/** 1-based line in the workflow source file, when resolvable. */
	line?: number;
	/** 1-based column in the workflow source file, when resolvable. */
	column?: number;
	lintTarget: LintTarget;
	/** Set when the issue comes from an embedded Code node snippet in SDK source. */
	nodeName?: string;
	parameterPath?: 'jsCode' | 'pythonCode';
}
