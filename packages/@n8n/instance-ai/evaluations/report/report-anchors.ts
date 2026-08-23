import type { WorkflowTestCaseResult } from '../types';

function sanitizeAnchor(value: string): string {
	return value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
}

export function getTestCaseAnchorId(result: WorkflowTestCaseResult, index: number): string {
	const base = result.fileSlug ?? `case-${String(index)}`;
	return `tc-${sanitizeAnchor(base)}`;
}
