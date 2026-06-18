import { readFileSync, readdirSync } from 'fs';
import { basename, join } from 'path';

import { WorkflowTestCaseSchema } from './schema';
import type { WorkflowTestCase } from '../../types';

export interface WorkflowTestCaseWithFile {
	testCase: WorkflowTestCase;
	/** Filename without extension, e.g. "contact-form-automation" */
	fileSlug: string;
}

function parseTestCaseFile(filePath: string): WorkflowTestCase {
	const content = readFileSync(filePath, 'utf-8');

	let raw: unknown;
	try {
		raw = JSON.parse(content);
	} catch (error) {
		throw new Error(
			`Failed to parse test case ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
		);
	}

	const parsed = WorkflowTestCaseSchema.safeParse(raw);
	if (!parsed.success) {
		const issues = parsed.error.issues
			.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
			.join('\n');
		throw new Error(`Invalid test case ${filePath}:\n${issues}`);
	}

	return parsed.data as WorkflowTestCase;
}

/** Split a comma-separated CLI value into a normalized list of substring tokens. */
function parseSubstringList(value: string | undefined): string[] {
	if (!value) return [];
	return value
		.split(',')
		.map((s) => s.trim().toLowerCase())
		.filter((s) => s.length > 0);
}

function getJsonFiles(filter?: string, exclude?: string): string[] {
	const allFiles = readdirSync(__dirname)
		.filter((f) => f.endsWith('.json'))
		.map((f) => join(__dirname, f));

	let files = allFiles;
	const includeTokens = parseSubstringList(filter);
	if (includeTokens.length > 0) {
		files = files.filter((f) => {
			const lower = basename(f).toLowerCase();
			return includeTokens.some((t) => lower.includes(t));
		});
	}

	const excludeTokens = parseSubstringList(exclude);
	if (excludeTokens.length > 0) {
		files = files.filter((f) => {
			const lower = basename(f).toLowerCase();
			return !excludeTokens.some((t) => lower.includes(t));
		});
	}

	return files;
}

/** Load test cases with their file slugs (for LangSmith dataset sync derived IDs). */
export function loadWorkflowTestCasesWithFiles(
	filter?: string,
	exclude?: string,
	tier?: string,
): WorkflowTestCaseWithFile[] {
	const cases = getJsonFiles(filter, exclude).map((f) => ({
		testCase: parseTestCaseFile(f),
		fileSlug: basename(f, '.json'),
	}));
	if (!tier) return cases;

	const matched = cases.filter(({ testCase }) => testCase.datasets.includes(tier));
	if (matched.length === 0) {
		const known = [...new Set(cases.flatMap(({ testCase }) => testCase.datasets))].sort();
		throw new Error(
			`No test cases match --tier "${tier}". Known tiers: ${known.join(', ') || '(none)'}.`,
		);
	}
	return matched;
}
