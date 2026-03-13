import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { RunnableConfig } from '@langchain/core/runnables';
import { z } from 'zod';

import type { EvalCriteria } from './judge-panel';
import { prompt } from '../../../src/prompts/builder';
import type { SimpleWorkflow } from '../../../src/types/workflow';
import { createEvaluatorChain, invokeEvaluatorChain } from '../llm-judge/evaluators/base';

export interface PairwiseEvaluationInput {
	evalCriteria: EvalCriteria;
	workflowJSON: SimpleWorkflow;
}

const pairwiseEvaluationLLMResultSchema = z.object({
	violations: z
		.array(
			z.object({
				rule: z.string(),
				justification: z.string(),
			}),
		)
		.describe(
			'List of criteria that were violated, this must be passed as a JSON array not a string.',
		),
	passes: z
		.array(
			z.object({
				rule: z.string(),
				justification: z.string(),
			}),
		)
		.describe('The criterion that was passed, this must be passed as a JSON array not a string.'),
});

export type PairwiseEvaluationResult = z.infer<typeof pairwiseEvaluationLLMResultSchema> & {
	/** True only if ALL criteria passed (no violations) */
	primaryPass: boolean;
	/** Ratio of passed criteria to total criteria (0-1) */
	diagnosticScore: number;
};

const EVALUATOR_SYSTEM_PROMPT = prompt()
	.section(
		'role',
		'You are an expert n8n workflow auditor. Your task is to strictly evaluate a candidate workflow against a provided set of requirements.',
	)
	.section(
		'role_definition',
		`- You are objective, precise, and evidence-based.
- You do not assume functionality that is not explicitly configured in the JSON.
- You verify every claim against the actual node configurations, connections, and parameters.`,
	)
	.section(
		'clarifications',
		`When evaluating criteria about "provider-specific nodes" or "using a specific AI provider":

- Provider-specific nodes (e.g., n8n-nodes-langchain.openAi, n8n-nodes-langchain.anthropic) are standalone nodes that directly call a provider's API.
- Chat model sub-nodes (e.g., @n8n/n8n-nodes-langchain.lmChatAnthropic, @n8n/n8n-nodes-langchain.lmChatOpenAi) are NOT provider-specific nodes. They are required infrastructure for connecting generic nodes like the AI Agent to a language model.

If a criterion says "do not use provider-specific nodes" or similar, the presence of lmChat* sub-nodes should NOT count as a violation - these are necessary connectors, not provider-specific workflow nodes.

When evaluating whether a specific node type has been used:
- The "@n8n/" prefix in node types is OPTIONAL - ignore it when comparing
- "@n8n/n8n-nodes-langchain.chatTrigger" and "n8n-nodes-langchain.chatTrigger" are the SAME node type
- This applies regardless of which form appears in the criteria or the workflow`,
	)
	.section(
		'constraints',
		`- Judge ONLY against the provided evaluation criteria. Do not apply external "best practices" unless explicitly asked.
- If a criterion is "not verifiable" from the JSON alone (e.g., requires runtime data), mark it as a violation and explain why.
- For every pass or violation, you MUST cite the specific node name or parameter that serves as evidence.
- Do not hallucinate nodes or parameters.`,
	)
	.build();

const humanTemplate = prompt()
	.section(
		'task_context',
		'Analyze the following n8n workflow against the provided checklist of criteria.',
	)
	.section('evaluation_criteria', '{userPrompt}')
	.section('workflow_candidate', '{generatedWorkflow}')
	.section(
		'instructions',
		`1. Read the <evaluation_criteria> carefully. It contains <do> and <dont> criteria.
2. For each criterion:
    - Search for evidence in the <workflow_candidate>.
    - Classify as PASS or VIOLATION using the rules below.
    - Provide a clear 'justification' citing the evidence (e.g., "Node 'HTTP Request' has method set to 'GET'").
3. Output the result as a structured JSON with 'violations' and 'passes'.`,
	)
	.section(
		'classification_rules',
		`CRITICAL: Understand how to classify each criterion correctly:

For <do> criteria (positive requirements like "Use X" or "Include Y"):
- PASS: The required element IS present in the workflow
- VIOLATION: The required element is NOT present in the workflow

For <dont> criteria (anti-patterns to avoid):
- PASS: The forbidden element is NOT present (the anti-pattern was avoided)
- VIOLATION: The forbidden element IS present (the anti-pattern was used)

Example: <dont>Use code node to organize data</dont>
- If NO code node exists for organizing data → PASS (anti-pattern avoided)
- If a code node IS used for organizing data → VIOLATION (anti-pattern present)`,
	)
	.build();

export async function evaluateWorkflowPairwise(
	llm: BaseChatModel,
	input: PairwiseEvaluationInput,
	config?: RunnableConfig,
): Promise<PairwiseEvaluationResult> {
	const dos = input.evalCriteria?.dos ?? '';
	const donts = input.evalCriteria?.donts ?? '';

	const doLines = dos.split('\n').filter((line) => line.trim().length > 0);
	const dontLines = donts.split('\n').filter((line) => line.trim().length > 0);

	const criteriaBuilder = prompt({ format: 'xml' });
	for (const line of doLines) {
		criteriaBuilder.section('do', line.trim());
	}
	for (const line of dontLines) {
		criteriaBuilder.section('dont', line.trim());
	}
	const criteriaList = criteriaBuilder.build();

	const chain = createEvaluatorChain(
		llm,
		pairwiseEvaluationLLMResultSchema,
		EVALUATOR_SYSTEM_PROMPT,
		humanTemplate,
	);

	const result = await invokeEvaluatorChain(
		chain,
		{
			userPrompt: criteriaList,
			generatedWorkflow: input.workflowJSON,
		},
		config,
	);

	const totalRules = result.passes.length + result.violations.length;
	const diagnosticScore = totalRules > 0 ? result.passes.length / totalRules : 0;
	const primaryPass = result.violations.length === 0;

	return {
		...result,
		primaryPass,
		diagnosticScore,
	};
}
