import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { SystemMessage } from '@langchain/core/messages';
import { ChatPromptTemplate, HumanMessagePromptTemplate } from '@langchain/core/prompts';
import type { INodeTypeDescription } from 'n8n-workflow';
import { OperationalError } from 'n8n-workflow';
import { z } from 'zod';

import { ParameterUpdatePromptBuilder } from './prompts/prompt-builder';

const humanTemplate = `
<current_workflow_json>
{workflow_json}
</current_workflow_json>

<current_execution_data_schema>
{execution_data_schema}
</current_execution_data_schema>

<selected_node>
Name: {node_name}
Type: {node_type}
Current Parameters: {current_parameters}
</selected_node>

<node_properties_definition>
The node accepts these properties (JSON array of property definitions):
{node_definition}
</node_properties_definition>

<requested_changes>
{changes}
</requested_changes>

Based on the requested changes and the node's property definitions, return the complete updated parameters object.
`;

export interface ParameterUpdaterOptions {
	nodeType: string;
	nodeDefinition: INodeTypeDescription;
	requestedChanges: string[];
}

export const parametersSchema = z
	.object({
		parameters: z
			.object({})
			.passthrough()
			.describe(
				"The complete updated parameters object for the node. This should be a JSON object that matches the node's parameter structure. Include ALL existing parameters plus the requested changes.",
			),
	})
	.describe(
		'The complete updated parameters object for the node. Must include only parameters from <node_properties_definition>, for example For example: { "parameters": { "method": "POST", "url": "https://api.example.com", "sendHeaders": true, "headerParameters": { "parameters": [{ "name": "Content-Type", "value": "application/json" }] } } }}',
	);

/**
 * Creates a parameter updater chain with dynamic prompt building
 */
export const createParameterUpdaterChain = (
	llm: BaseChatModel,
	options: ParameterUpdaterOptions,
) => {
	if (!llm.bindTools) {
		throw new OperationalError("LLM doesn't support binding tools");
	}

	// Build dynamic system prompt based on context
	const systemPromptContent = ParameterUpdatePromptBuilder.buildSystemPrompt({
		nodeType: options.nodeType,
		nodeDefinition: options.nodeDefinition,
		requestedChanges: options.requestedChanges,
		hasResourceLocatorParams: ParameterUpdatePromptBuilder.hasResourceLocatorParameters(
			options.nodeDefinition,
		),
	});

	// Log token estimate for monitoring
	const tokenEstimate = ParameterUpdatePromptBuilder.estimateTokens(systemPromptContent);
	console.log(`Parameter updater prompt size: ~${tokenEstimate} tokens`);

	const systemPrompt = new SystemMessage(systemPromptContent);

	const prompt = ChatPromptTemplate.fromMessages([
		systemPrompt,
		HumanMessagePromptTemplate.fromTemplate(humanTemplate),
	]);
	const llmWithStructuredOutput = llm.withStructuredOutput(parametersSchema);
	const modelWithStructure = prompt.pipe(llmWithStructuredOutput);

	return modelWithStructure;
};
