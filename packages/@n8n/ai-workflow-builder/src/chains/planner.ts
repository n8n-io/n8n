import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { AIMessageChunk } from '@langchain/core/messages';
import { SystemMessage } from '@langchain/core/messages';
import { ChatPromptTemplate, HumanMessagePromptTemplate } from '@langchain/core/prompts';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { OperationalError } from 'n8n-workflow';
import { z } from 'zod';

export const plannerPrompt = new SystemMessage(
	`You are a Workflow Planner for n8n, a platform that helps users automate processes across different services and APIs.

## Your Task
Convert user requests into clear, sequential workflow steps that can be implemented with n8n nodes.

## Guidelines
1. Analyze the user request to understand their end goal and required process
2. Break down the automation into logical steps based on complexity - simpler workflows need fewer steps, complex ones may need more
3. Focus on actions (fetch data, transform, filter, send notification, etc.)
4. Create steps that can be mapped to n8n nodes later
5. Order steps sequentially from trigger to final action
6. Be specific about data transformations needed
7. Include error handling steps when appropriate
8. Only recommend raw HTTP requests if you think there isn't a suitable n8n node

## Output Format
Return ONLY a JSON object with this structure:
\`\`\`json
{
  "steps": [
    "[Brief action-oriented description]",
    "[Brief action-oriented description]",
    ...
  ]
}
\`\`\`

## Examples of Good Step Descriptions
- "Trigger when a new email arrives in Gmail inbox"
- "Filter emails to only include those with attachments"
- "Extract data from CSV attachments"
- "Transform data to required format for the API"
- "Send HTTP request to external API with extracted data"
- "Post success message to Slack channel"

IMPORTANT: Do not include HTML tags, markdown formatting, or explanations outside the JSON.`,
);

const planSchema = z.object({
	steps: z
		.array(
			z
				.string()
				.describe(
					'A clear, action-oriented description of a single workflow step. Do not include "Step N" or similar, just the action',
				),
		)
		.min(1)
		.describe(
			'An ordered list of workflow steps that, when implemented, will fulfill the user request. Each step should be concise, action-oriented, and implementable with n8n nodes.',
		),
});

const generatePlanTool = new DynamicStructuredTool({
	name: 'generate_plan',
	description:
		'Convert a user workflow request into a logical sequence of clear, achievable steps that can be implemented with n8n nodes.',
	schema: planSchema,
	func: async (input) => {
		return { steps: input.steps };
	},
});

const humanTemplate = '{prompt}';
const chatPrompt = ChatPromptTemplate.fromMessages([
	plannerPrompt,
	HumanMessagePromptTemplate.fromTemplate(humanTemplate),
]);

export const plannerChain = (llm: BaseChatModel) => {
	if (!llm.bindTools) {
		throw new OperationalError("LLM doesn't support binding tools");
	}

	return chatPrompt
		.pipe(
			llm.bindTools([generatePlanTool], {
				tool_choice: generatePlanTool.name,
			}),
		)
		.pipe((x: AIMessageChunk) => {
			const toolCall = x.tool_calls?.[0];
			return (toolCall?.args as z.infer<typeof planSchema>).steps;
		});
};
