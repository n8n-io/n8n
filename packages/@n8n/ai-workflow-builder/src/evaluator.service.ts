import { ChatAnthropic } from '@langchain/anthropic';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { Service } from '@n8n/di';
import { z } from 'zod';

import type { SimpleWorkflow } from '@/types';

interface WorkflowGenerationScore {
	total: number; // 0 to 1
}

@Service()
export class AiWorkflowBuilderEvaluatorService {
	private llmComplexTask: BaseChatModel;

	constructor() {
		this.llmComplexTask = new ChatAnthropic({
			model: 'claude-3-7-sonnet-20250219',
			apiKey: process.env.N8N_AI_ANTHROPIC_KEY ?? '',
			temperature: 0,
			// maxTokens: 16000,
		});
	}

	async scoreGeneratedWorkflow(
		generatedWorkflow: SimpleWorkflow,
		referenceWorkflow: SimpleWorkflow,
	): Promise<WorkflowGenerationScore> {
		const promptTemplate = ChatPromptTemplate.fromMessages([
			{
				role: 'system',
				content:
					'You are an expert in evaluating n8n workflows. Your task is to score the quality of a generated workflow based on a reference workflow.',
			},
			{
				role: 'user',
				content: `Evaluate the following workflows and provide a score from 0 to 1, where 0 means the generated workflow is completely different from the reference workflow, and 1 means it is identical. The score should reflect how closely the generated workflow matches the reference workflow in terms of structure, nodes, and overall logic.
<generated_workflow>
{generated_workflow}
</generated_workflow>

<reference_workflow>
{reference_workflow}
</reference_workflow>
`,
			},
		]);

		const chain = promptTemplate.pipe(
			this.llmComplexTask?.withStructuredOutput(
				z.object({
					total: z
						.number()
						.min(0)
						.max(1)
						.describe(
							'Score from 0 to 1 indicating the quality of the generated workflow compared to the reference workflow.',
						),
				}),
			),
		);

		const result = await chain.invoke({
			generated_workflow: JSON.stringify(generatedWorkflow, null, 2),
			reference_workflow: JSON.stringify(referenceWorkflow, null, 2),
		});

		return result;
	}
}
