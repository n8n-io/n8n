import { readFileSync, readdirSync } from 'fs';
import { basename, join } from 'path';

import { WorkflowTestCaseSchema } from './schema';
import { DETERMINISTIC_CHECKS, LLM_CHECKS } from '../../binaryChecks/checks';
import type { WorkflowTestCase } from '../../types';

export interface WorkflowTestCaseWithFile {
	testCase: WorkflowTestCase;
	/** Filename without extension, e.g. "contact-form-automation" */
	fileSlug: string;
}

const KNOWN_BINARY_CHECK_NAMES = new Set(
	[...DETERMINISTIC_CHECKS, ...LLM_CHECKS].map((c) => c.name),
);

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
			.map((i) => `  - ${i.path.join('.')}: ${i.message}`)
			.join('\n');
		throw new Error(`Invalid test case ${filePath}:\n${issues}`);
	}

	for (const sc of parsed.data.scenarios) {
		const requested = sc.binaryChecks ?? [];
		const unknown = requested.filter((name) => !KNOWN_BINARY_CHECK_NAMES.has(name));
		if (unknown.length > 0) {
			throw new Error(
				`${filePath}: scenario "${sc.name}" requests unknown binary check(s): ${unknown.join(', ')}. ` +
					`Available: ${[...KNOWN_BINARY_CHECK_NAMES].sort().join(', ')}`,
			);
		}
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
	const dir = __dirname;
	let files = readdirSync(dir).filter((f) => f.endsWith('.json'));

	const includeTokens = parseSubstringList(filter);
	if (includeTokens.length > 0) {
		files = files.filter((f) => {
			const lower = f.toLowerCase();
			return includeTokens.some((t) => lower.includes(t));
		});
	}

	const excludeTokens = parseSubstringList(exclude);
	if (excludeTokens.length > 0) {
		files = files.filter((f) => {
			const lower = f.toLowerCase();
			return !excludeTokens.some((t) => lower.includes(t));
		});
	}

	return files.map((f) => join(dir, f));
}

/** Load test cases with their file slugs (for LangSmith dataset sync derived IDs). */
export function loadWorkflowTestCasesWithFiles(
	filter?: string,
	exclude?: string,
): WorkflowTestCaseWithFile[] {
	return getJsonFiles(filter, exclude).map((f) => ({
		testCase: parseTestCaseFile(f),
		fileSlug: basename(f, '.json'),
	}));
}
