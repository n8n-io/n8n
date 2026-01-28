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
- This applies regardless of which form appears in the criteria or the workflow

CASE INSENSITIVITY:
- Node names, model names, and parameter values should be compared case-insensitively
- "SoRa", "sora", "SORA" are all the same model
- "gpt-4o-mini", "GPT-4o-Mini" are the same model

CONNECTION PATTERNS:
- "followed by" means the output of node A connects to the input of node B (directly, not through other nodes)
- "connected to" means a direct edge exists between two nodes
- "connected to both X and Y" means the same node instance has direct connections to both targets`,
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
		`1. Read each <spec> criterion carefully.
2. For each specification:
    - Determine its intent from the text (requirement vs prohibition).
    - Search for evidence in the <workflow_candidate>.
    - Classify as PASS or VIOLATION based on the criterion's semantics.
    - Provide a clear 'justification' citing specific evidence (e.g., "Node 'HTTP Request' has method set to 'GET'").
3. Output the result as structured JSON with 'violations' and 'passes'.`,
	)
	.section(
		'classification_rules',
		`CRITICAL: Interpret each criterion's intent from its text:

For REQUIREMENT criteria (positive phrasing like "Use X", "Include Y", "Must have Z"):
- PASS: The required element IS present and correctly configured
- VIOLATION: The required element is NOT present or misconfigured

For PROHIBITION criteria (negative phrasing like "Do not use X", "Avoid Y", "No Z"):
- PASS: The forbidden element is NOT present (prohibition honored)
- VIOLATION: The forbidden element IS present (prohibition violated)

Example specifications:
- "Use the Slack node" → PASS if Slack node exists, VIOLATION if missing
- "Do not use HTTP Request" → PASS if no HTTP Request, VIOLATION if present`,
	)
	.build();

export async function evaluateWorkflowPairwise(
	llm: BaseChatModel,
	input: PairwiseEvaluationInput,
	config?: RunnableConfig,
): Promise<PairwiseEvaluationResult> {
	const specs = input.evalCriteria?.specs ?? '';
	const specLines = specs.split('\n').filter((line) => line.trim().length > 0);

	const criteriaBuilder = prompt({ format: 'xml' });
	for (const line of specLines) {
		criteriaBuilder.section('spec', line.trim());
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
