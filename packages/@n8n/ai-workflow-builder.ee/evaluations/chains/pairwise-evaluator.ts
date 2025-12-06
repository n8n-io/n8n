import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { z } from 'zod';

import { createEvaluatorChain, invokeEvaluatorChain } from './evaluators/base';
import type { SimpleWorkflow } from '../../src/types/workflow';

export interface PairwiseEvaluationInput {
	evalCriteria: {
		dos: string;
		donts: string;
	};
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
		.describe('List of criteria that were violated'),
	passes: z
		.array(
			z.object({
				rule: z.string(),
				justification: z.string(),
			}),
		)
		.describe('List of criteria that were passed'),
});

export type PairwiseEvaluationResult = z.infer<typeof pairwiseEvaluationLLMResultSchema> & {
	/** True only if ALL criteria passed (no violations) */
	primaryPass: boolean;
	/** Ratio of passed criteria to total criteria (0-1) */
	diagnosticScore: number;
};

const EVALUATOR_SYSTEM_PROMPT = `You are an expert n8n workflow auditor. Your task is to strictly evaluate a candidate workflow against a provided set of requirements.

<role_definition>
- You are objective, precise, and evidence-based.
- You do not assume functionality that is not explicitly configured in the JSON.
- You verify every claim against the actual node configurations, connections, and parameters.
</role_definition>

<constraints>
- Judge ONLY against the provided evaluation criteria. Do not apply external "best practices" unless explicitly asked.
- If a criterion is "not verifiable" from the JSON alone (e.g., requires runtime data), mark it as a violation and explain why.
- For every pass or violation, you MUST cite the specific node name or parameter that serves as evidence.
- Do not hallucinate nodes or parameters.
</constraints>`;

const humanTemplate = `
<task_context>
Analyze the following n8n workflow against the provided checklist of criteria.
</task_context>

<evaluation_criteria>
{userPrompt}
</evaluation_criteria>

<workflow_candidate>
{generatedWorkflow}
</workflow_candidate>

<instructions>
1. Read the <evaluation_criteria> carefully.
2. For each criterion:
    - Search for evidence in the <workflow_candidate>.
    - Determine if it passes or fails.
    - Provide a clear 'justification' citing the evidence (e.g., "Node 'HTTP Request' has method set to 'GET'").
3. Output the result as a structured JSON with 'violations' and 'passes'.
</instructions>
`;

export function createPairwiseEvaluatorChain(llm: BaseChatModel) {
	return createEvaluatorChain(
		llm,
		pairwiseEvaluationLLMResultSchema,
		EVALUATOR_SYSTEM_PROMPT,
		humanTemplate,
	);
}

export async function evaluateWorkflowPairwise(
	llm: BaseChatModel,
	input: PairwiseEvaluationInput,
): Promise<PairwiseEvaluationResult> {
	const dos = input.evalCriteria?.dos ?? '';
	const donts = input.evalCriteria?.donts ?? '';
	const criteriaList = `[DO]\n${dos}\n\n[DONT]\n${donts}`;

	const result = await invokeEvaluatorChain(createPairwiseEvaluatorChain(llm), {
		userPrompt: criteriaList,
		generatedWorkflow: input.workflowJSON,
	});

	const totalRules = result.passes.length + result.violations.length;
	const diagnosticScore = totalRules > 0 ? result.passes.length / totalRules : 0;
	const primaryPass = result.violations.length === 0;

	return {
		...result,
		primaryPass,
		diagnosticScore,
	};
}
