import { readFileSync } from 'fs';
import { basename, dirname, resolve } from 'path';

import { loadConversationSeed } from '../../harness/conversation-seed';
import { EvalTestCaseSchema } from '../../harness/schema';
import type { WorkflowTestCase } from '../../types';
import { getJsonFiles } from '../../utils/get-json-files';
import type { WorkflowTestCaseWithFile } from '../workflows';

const AGENT_INTENT_CLASSIFICATION_INSTRUCTION = [
	'This is not a request to build or execute anything. Do not create workflows, do not create agents, and do not run anything.',
	'I only want you to classify the intent of this hypothetical request:',
	'Say whether this should be handled as a deterministic workflow, a hybrid workflow with a bounded AI judgment step, a full agent, or a single AI task. Briefly explain why in terms of control flow, runtime decision-making, tool-use loops, unstructured data, and whether the next action depends on prior results.',
].join('\n');

function prependIntentClassificationPrompt(testCase: WorkflowTestCase): void {
	if (!testCase.conversation) return;
	const firstUserTurn = testCase.conversation.find((turn) => turn.role === 'user');
	if (!firstUserTurn) return;

	firstUserTurn.text = `${AGENT_INTENT_CLASSIFICATION_INSTRUCTION}\n${firstUserTurn.text}`;
}

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
	prependIntentClassificationPrompt(testCase);
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
