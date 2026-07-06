import type { WorkflowTestCase } from '../../types';
import { loadEvalCasesFromDir, type WorkflowTestCaseWithFile } from '../../utils/load-eval-cases';

const INTENT_CLASSIFICATION_PREAMBLE = [
	'This is not a request to build or execute anything. Do not create workflows, do not create agents, and do not run anything.',
	'Classify the intent of this hypothetical request and reply using the intent-recognition classification output format',
	'(Part / Anchor / Embeds other / Rationale — one block per independent part; include clarifying questions when the anchor is clarify):',
].join('\n');

function withIntentClassificationPreamble(testCase: WorkflowTestCase): WorkflowTestCase {
	return {
		...testCase,
		conversation: testCase.conversation?.map((turn, index) =>
			index === 0 && turn.role === 'user'
				? { ...turn, text: [INTENT_CLASSIFICATION_PREAMBLE, turn.text].join('\n') }
				: turn,
		),
	};
}

export function loadAgentEvalTestCasesWithFiles(
	filter?: string,
	exclude?: string,
): WorkflowTestCaseWithFile[] {
	return loadEvalCasesFromDir(__dirname, filter, exclude, withIntentClassificationPreamble);
}
