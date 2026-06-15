import { prompt } from '@/prompts/builder';

/**
 * Responder evaluation types that map to different evaluation strategies.
 *
 * Currently all responses happen after a full workflow generation.
 * Plan mode types can be added later when that feature is implemented.
 */
export type ResponderEvalType = 'workflow_summary' | 'datatable_instructions' | 'general_response';

export interface ResponderEvalCriteria {
	type: ResponderEvalType;
	criteria: string;
}

const FORBIDDEN_PHRASES = [
	'activate workflow',
	'activate the workflow',
	'click the activate button',
];

function buildForbiddenPhrasesSection(): string {
	return FORBIDDEN_PHRASES.map((p) => `- "${p}"`).join('\n');
}

function buildTypeSpecificGuidance(evalType: ResponderEvalType): string {
	switch (evalType) {
		case 'workflow_summary':
			return `
				Additionally evaluate:
				- Does the response accurately describe the workflow that was built?
				- Are all key nodes and their purposes mentioned?
				- Is the explanation of the workflow flow logical and complete?
				- Does it explain how the workflow addresses the user request?
				- Are setup instructions (credentials, placeholders) clearly provided?
			`;

		case 'datatable_instructions':
			return `
				Additionally evaluate:
				- Are the data table creation instructions clear and actionable?
				- Do the column names/types match what the workflow expects?
				- Is the user told exactly what to create manually?
			`;

		case 'general_response':
			return '';
	}
}

function buildWorkflowSummary(workflowJSON: unknown): string {
	if (!workflowJSON || typeof workflowJSON !== 'object') {
		return 'No workflow data available';
	}

	const workflow = workflowJSON as { nodes?: Array<{ name?: string; type?: string }> };
	if (!Array.isArray(workflow.nodes) || workflow.nodes.length === 0) {
		return 'Empty workflow (no nodes)';
	}

	const nodeList = workflow.nodes
		.map((node: { name?: string; type?: string }) => {
			const name = node.name ?? 'unnamed';
			const type = node.type ?? 'unknown';
			return `- ${name} (${type})`;
		})
		.join('\n');

	return `Workflow contains ${workflow.nodes.length} nodes:\n${nodeList}`;
}

/**
 * Build the LLM judge prompt for evaluating a responder output.
 */
export function buildResponderJudgePrompt(args: {
	userPrompt: string;
	responderOutput: string;
	evalCriteria: ResponderEvalCriteria;
	workflowJSON?: unknown;
}): string {
	const { userPrompt, responderOutput, evalCriteria, workflowJSON } = args;
	const typeGuidance = buildTypeSpecificGuidance(evalCriteria.type);
	const hasWorkflow = workflowJSON !== undefined;

	return prompt()
		.section(
			'role',
			'You are an expert evaluator assessing the quality of an AI assistant response in a workflow automation context.',
		)
		.section(
			'task',
			`
				Evaluate the responder output against the provided criteria.
				Score each dimension from 0.0 to 1.0.

				Return your evaluation as JSON with this exact structure:
				\`\`\`json
				{
				  "relevance": { "score": 0.0, "comment": "..." },
				  "accuracy": { "score": 0.0, "comment": "..." },',
				  "completeness": { "score": 0.0, "comment": "..." },
				  "clarity": { "score": 0.0, "comment": "..." },
				  "tone": { "score": 0.0, "comment": "..." },',
				  "criteriaMatch": { "score": 0.0, "comment": "..." },
				  "forbiddenPhrases": { "score": 0.0, "comment": "..." },
				  "overallScore": 0.0,',
				  "summary": "..."
				}
				\`\`\`
				`,
		)
		.section(
			'dimensions',
			`
				**relevance** (0-1): Does the response address the user request?'
				**accuracy** (0-1): Is the information factually correct? If a workflow is provided, verify that the responder's claims about the workflow (nodes, integrations, actions) match what was actually built."
				**completeness** (0-1): Does it cover everything needed?
				**clarity** (0-1): Is the response well-structured and easy to understand?
				**tone** (0-1): Is the tone professional and helpful?',
				**criteriaMatch** (0-1): Does it satisfy the specific evaluation criteria below?
				**forbiddenPhrases** (0-1): 1.0 if no forbidden phrases are present, 0.0 if any are found.
				`,
		)
		.section('forbiddenPhrases', buildForbiddenPhrasesSection())
		.section('userPrompt', userPrompt)
		.section('responderOutput', responderOutput)
		.sectionIf(hasWorkflow, 'actualWorkflow', () => buildWorkflowSummary(workflowJSON))
		.section('evaluationCriteria', evalCriteria.criteria)
		.sectionIf(typeGuidance.length > 0, 'typeSpecificGuidance', typeGuidance)
		.build();
}
