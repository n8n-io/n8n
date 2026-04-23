import type { InstanceAiEvalMetricProposal } from '@n8n/api-types';
import { instanceAiEvalMetricProposalSchema } from '@n8n/api-types';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { z } from 'zod';

import { createEvalAgent, extractText, HAIKU_MODEL } from '../../utils/eval-agents';

export interface EvalShape {
	suggestedInputColumns: string[];
	suggestedOutputColumns: string[];
	suggestedMetrics: InstanceAiEvalMetricProposal[];
}

export const DEFAULT_EVAL_SHAPE: EvalShape = {
	suggestedInputColumns: ['input'],
	suggestedOutputColumns: ['expected_output'],
	suggestedMetrics: [
		{
			id: 'correctness',
			name: 'Correctness',
			kind: 'llm-judge',
			description: 'Judge whether the workflow output is factually correct given the input.',
			prompt:
				'Given the input and expected output, rate from 0 to 1 how correct the actual output is.',
			cannedMetricKey: 'correctness',
			defaultEnabled: true,
		},
	],
};

const evalShapeSchema = z.object({
	suggestedInputColumns: z.array(z.string()).min(1).max(10),
	suggestedOutputColumns: z.array(z.string()).min(1).max(10),
	suggestedMetrics: z.array(instanceAiEvalMetricProposalSchema).min(1).max(5),
});

const SYSTEM_INSTRUCTIONS = `You analyze n8n workflows that use AI/LLM nodes and propose an evaluation setup.

Given a workflow, infer:
- suggestedInputColumns: names of dataset columns that feed the workflow (e.g. "user_query", "document_id")
- suggestedOutputColumns: names of columns for capturing workflow output (e.g. "agent_response", "classification")
- suggestedMetrics: 2-3 metrics to evaluate output quality. Prefer canned metric keys when they match:
  - "correctness" — factual correctness of generated text
  - "relevance" — relevance of retrieved documents (RAG)
  - "tool_use" — correctness of tool selection by agents
  - "helpfulness" — general response helpfulness
  Use kind="llm-judge" for subjective metrics, "exact-match" or "contains" for deterministic ones.

Respond with a single JSON object, no prose.`;

function buildUserPrompt(workflow: WorkflowJSON): string {
	const summary = (workflow.nodes ?? []).map((n) => `- ${n.name} (${n.type})`).join('\n');
	return `Workflow name: ${workflow.name ?? 'Untitled'}\nNodes:\n${summary}\n\nReturn JSON with keys: suggestedInputColumns, suggestedOutputColumns, suggestedMetrics.`;
}

export async function inferEvalShape(workflow: WorkflowJSON): Promise<EvalShape> {
	try {
		const agent = createEvalAgent('eval-shape-inference', {
			model: HAIKU_MODEL,
			instructions: SYSTEM_INSTRUCTIONS,
		});
		const result = await agent.generate([
			{ role: 'user', content: [{ type: 'text', text: buildUserPrompt(workflow) }] },
		]);
		const text = extractText(result);
		const parsed: unknown = JSON.parse(text);
		const validated = evalShapeSchema.safeParse(parsed);
		if (!validated.success) return DEFAULT_EVAL_SHAPE;
		return validated.data;
	} catch {
		return DEFAULT_EVAL_SHAPE;
	}
}
