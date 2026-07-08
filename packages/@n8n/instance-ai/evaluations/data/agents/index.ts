import type { WorkflowTestCase } from '../../types';
import { loadEvalCasesFromDir, type WorkflowTestCaseWithFile } from '../../utils/load-eval-cases';

const INTENT_CLASSIFICATION_PREAMBLE = [
	'This is not a request to build or execute anything. Do not create workflows, do not create agents, and do not run anything.',
	'You may still load skills to inform your classification.',
	'I only want you to classify the intent of the hypothetical request below, using two decisions:',
	'1. anchor — which primitive owns the top-level control flow: "workflow-anchored" (the outer shell is a workflow graph; any LLM steps are bounded transformers like classify, extract, summarize, or a single decision), "agent-anchored" (an agent owns the flow and decides the next step at runtime), "needs-clarification" (the request is under-specified on an anchor-deciding axis), or "out-of-scope" (not a build request at all, e.g. a meta or product question).',
	'2. embeds_other — whether the other primitive appears inside: an agent embedded as a step of a workflow, or a workflow invoked as a tool of an agent. Answer true or false (not applicable for needs-clarification and out-of-scope).',
	'If the request contains multiple independent automations, classify each part separately.',
	'Do not ask me any questions. If clarification would be needed, say so and name the missing dimensions instead.',
	'Briefly justify your classification.',
	'End your reply with a fenced code block tagged `intent` containing only JSON in exactly this shape:',
	'```intent',
	'{"anchor": "workflow-anchored" | "agent-anchored" | "needs-clarification" | "out-of-scope", "embeds_other": true | false | "n/a"}',
	'```',
	'If the request contains multiple independent automations, instead output {"parts": [{"anchor": ..., "embeds_other": ...}, ...]} with one entry per part, in the order the parts appear in the request.',
	'Here is the request:',
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
