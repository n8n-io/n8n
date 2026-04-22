import { readFileSync, readdirSync } from 'fs';
import { basename, join } from 'path';

import type { WorkflowTestCase } from '../../types';

export interface WorkflowTestCaseWithFile {
	testCase: WorkflowTestCase;
	/** Filename without extension, e.g. "contact-form-automation" */
	fileSlug: string;
}

function parseTestCaseFile(filePath: string): WorkflowTestCase {
	const content = readFileSync(filePath, 'utf-8');
	try {
		return JSON.parse(content) as WorkflowTestCase;
	} catch (error) {
		throw new Error(
			`Failed to parse test case ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

function getJsonFiles(filter?: string): string[] {
	const dir = __dirname;
	let files = readdirSync(dir).filter((f) => f.endsWith('.json'));
	if (filter) {
		files = files.filter((f) => f.toLowerCase().includes(filter.toLowerCase()));
	}
	return files.map((f) => join(dir, f));
}

/** Load test cases with their file slugs (for LangSmith dataset sync derived IDs). */
export function loadWorkflowTestCasesWithFiles(filter?: string): WorkflowTestCaseWithFile[] {
	return getJsonFiles(filter).map((f) => ({
		testCase: parseTestCaseFile(f),
		fileSlug: basename(f, '.json'),
	}));
}
