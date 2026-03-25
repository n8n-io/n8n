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

export function loadWorkflowTestCases(): WorkflowTestCase[] {
	const dir = __dirname;
	const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
	return files.map((f) => parseTestCaseFile(join(dir, f)));
}
