import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { SystemMessage } from '@langchain/core/messages';
import { ChatPromptTemplate, HumanMessagePromptTemplate } from '@langchain/core/prompts';
import type { Logger } from 'n8n-workflow';
import { z } from 'zod';

import { LLMServiceError } from '../errors';
import type { ParameterUpdaterOptions } from '../types/config';
import { instanceUrlPrompt } from './prompts/instance-url';
import { ParameterUpdatePromptBuilder } from './prompts/prompt-builder';

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

const nodeDefinitionPrompt = `
The node accepts these properties:
<node_properties_definition>
{node_definition}
</node_properties_definition>`;

const workflowContextPrompt = `
<current_workflow_json>
{workflow_json}
</current_workflow_json>

<current_simplified_execution_data>
{execution_data}
</current_simplified_execution_data>

<current_execution_nodes_schemas>
{execution_schema}
</current_execution_nodes_schemas>

<selected_node>
Name: {node_name}
Type: {node_type}

Current Parameters: {current_parameters}
</selected_node>

<requested_changes>
{changes}
</requested_changes>

Based on the requested changes and the node's property definitions, return the complete updated parameters object.`;

/**
 * Creates a parameter updater chain with dynamic prompt building
 */
export const createParameterUpdaterChain = (
	llm: BaseChatModel,
	options: ParameterUpdaterOptions,
	logger?: Logger,
) => {
	if (typeof llm.withStructuredOutput !== 'function') {
		throw new LLMServiceError("LLM doesn't support withStructuredOutput", {
			llmModel: llm._llmType(),
		});
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
	logger?.debug(`Parameter updater prompt size: ~${tokenEstimate} tokens`);

	// Cache system prompt and node definition prompt
	const systemPrompt = new SystemMessage({
		content: [
			{
				type: 'text',
				text: systemPromptContent,
				cache_control: { type: 'ephemeral' },
			},
		],
	});
	const nodeDefinitionMessage = ChatPromptTemplate.fromMessages([
		[
			'human',
			[
				{
					type: 'text',
					text: nodeDefinitionPrompt,
					cache_control: { type: 'ephemeral' },
				},
				{
					type: 'text',
					text: instanceUrlPrompt,
				},
			],
		],
	]);
	// Do not cache workflow context prompt as it is dynamic
	const workflowContextMessage = HumanMessagePromptTemplate.fromTemplate(workflowContextPrompt);

	const prompt = ChatPromptTemplate.fromMessages([
		systemPrompt,
		nodeDefinitionMessage,
		workflowContextMessage,
	]);
	const llmWithStructuredOutput = llm.withStructuredOutput(parametersSchema);
	const modelWithStructure = prompt.pipe(llmWithStructuredOutput);

	return modelWithStructure;
};
