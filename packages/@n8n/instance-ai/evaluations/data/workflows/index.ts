import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

import type { WorkflowTestCase } from '../../types';

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

export function loadWorkflowTestCases(filter?: string): WorkflowTestCase[] {
	const dir = __dirname;
	let files = readdirSync(dir).filter((f) => f.endsWith('.json'));
	if (filter) {
		files = files.filter((f) => f.toLowerCase().includes(filter.toLowerCase()));
	}
	return files.map((f) => parseTestCaseFile(join(dir, f)));
}
