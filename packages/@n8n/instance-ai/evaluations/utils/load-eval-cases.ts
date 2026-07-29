import { readFileSync } from 'fs';
import { basename } from 'path';

import { getJsonFiles } from './get-json-files';
import { EvalTestCaseSchema } from '../harness/schema';
import type { WorkflowTestCase } from '../types';

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

	const parsed = EvalTestCaseSchema.safeParse(raw);
	if (!parsed.success) {
		const issues = parsed.error.issues
			.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
			.join('\n');
		throw new Error(`Invalid test case ${filePath}:\n${issues}`);
	}

	return parsed.data;
}

/** Load test cases with their file slugs (for LangSmith dataset sync derived IDs). */
export function loadEvalCasesFromDir(
	dataDir: string,
	filter?: string,
	exclude?: string,
	transform?: (testCase: WorkflowTestCase) => WorkflowTestCase,
): WorkflowTestCaseWithFile[] {
	return getJsonFiles(dataDir, filter, exclude).map((f) => {
		const testCase = parseTestCaseFile(f);
		return {
			testCase: transform ? transform(testCase) : testCase,
			fileSlug: basename(f, '.json'),
		};
	});
}
