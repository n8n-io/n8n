import type { IssueSeverity } from '../validation/issue-severity';

export type LintTarget = 'sdk' | 'jsCode' | 'pythonCode';

/**
 * Source-lint finding. Severity is set at the rule site — today all lint
 * rules are informational (do not block save / CLI exit).
 */
export interface SourceLintIssue {
	code: string;
	message: string;
	severity: Extract<IssueSeverity, 'informational'>;
	/** 1-based line in the workflow source file, when resolvable. */
	line?: number;
	/** 1-based column in the workflow source file, when resolvable. */
	column?: number;
	lintTarget: LintTarget;
	/** Set when the issue comes from an embedded Code node snippet in SDK source. */
	nodeName?: string;
	parameterPath?: 'jsCode' | 'pythonCode';
}

/** Build a source-lint issue with informational severity at the rule site. */
export function lintIssue(
	issue: Omit<SourceLintIssue, 'severity'> & { severity?: 'informational' },
): SourceLintIssue {
	return { severity: 'informational', ...issue };
}
