import { readFileSync } from 'fs';
import { basename, dirname, resolve } from 'path';

import { loadConversationSeed } from '../../harness/conversation-seed';
import { EvalTestCaseSchema } from '../../harness/schema';
import type { WorkflowTestCase } from '../../types';
import { getJsonFiles } from '../../utils/get-json-files';
import type { WorkflowTestCaseWithFile } from '../workflows';

function parseTestCaseFile(filePath: string): WorkflowTestCase {
	const content = readFileSync(filePath, 'utf-8');

	let raw: unknown;
	try {
		raw = JSON.parse(content);
	} catch (error) {
		throw new Error(
			`Failed to parse agent eval test case ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
		);
	}

	const parsed = EvalTestCaseSchema.safeParse(raw);
	if (!parsed.success) {
		const issues = parsed.error.issues
			.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
			.join('\n');
		throw new Error(`Invalid agent eval test case ${filePath}:\n${issues}`);
	}

	const testCase = parsed.data;
	if (testCase.seedFile) {
		const resolved = resolve(dirname(filePath), testCase.seedFile);
		try {
			loadConversationSeed(resolved);
		} catch (error) {
			throw new Error(
				`Invalid agent eval test case ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
		testCase.seedFile = resolved;
	}
	return testCase;
}

export function loadAgentEvalTestCasesWithFiles(
	filter?: string,
	exclude?: string,
	tier?: string,
): WorkflowTestCaseWithFile[] {
	const cases = getJsonFiles(__dirname, filter, exclude).map((f) => ({
		testCase: parseTestCaseFile(f),
		fileSlug: basename(f, '.json'),
	}));
	if (!tier) return cases;

	const matched = cases.filter(({ testCase }) => testCase.datasets.includes(tier));
	if (matched.length === 0) {
		const known = [...new Set(cases.flatMap(({ testCase }) => testCase.datasets))].sort();
		throw new Error(
			`No agent eval test cases match --tier "${tier}". Known tiers: ${known.join(', ') || '(none)'}.`,
		);
	}
	return matched;
}
