// import type { BaseChatModel } from '@langchain/core/language_models/base';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { AIMessageChunk } from '@langchain/core/messages';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { OperationalError, type INodeTypeDescription } from 'n8n-workflow';
import { z } from 'zod';

import {
	supervisorPrompt,
	plannerPrompt,
	nodeSelectorPrompt,
	connectionComposerPrompt,
	parameterPrefillerPrompt,
	nodesComposerPrompt,
} from './prompts';

///////////////////// Supervisor Agent /////////////////////
const nextStepTool = new DynamicStructuredTool({
	name: 'route_next_step',
	description:
		'Determine the next phase in the n8n workflow creation process based on current context.',
	schema: z.object({
		next: z
			.enum(['PLAN', 'NODE_SELECTION', 'USER_REVIEW', 'FINALIZE', 'END'])
			.describe(
				'The next phase to transition to in the workflow creation process. PLAN creates workflow steps, NODE_SELECTION maps steps to n8n nodes, USER_REVIEW pauses for feedback, FINALIZE generates the final workflow JSON, END terminates the process.',
			),
	}),
	func: async (input: { next: string }) => {
		return { next: input.next };
	},
});

export const supervisorChain = (llm: BaseChatModel) => {
	if (!llm.bindTools) {
		throw new OperationalError("LLM doesn't support binding tools");
	}

	return supervisorPrompt
		.pipe(llm.bindTools([nextStepTool], { tool_choice: 'route_next_step' }))
		.pipe((x: AIMessageChunk) => {
			const toolCall = x.tool_calls?.[0];
			return toolCall?.args as { next: string };
		});
};

///////////////////// Planner Agent /////////////////////
export const plannerAgent = (llm: BaseChatModel) =>
	createReactAgent({
		llm,
		tools: [
			new DynamicStructuredTool({
				name: 'generate_plan',
				description:
					'Convert a user workflow request into a logical sequence of clear, achievable steps that can be implemented with n8n nodes.',
				schema: z.object({
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
				}),
				func: async (input: { steps: string[] }) => {
					return { steps: input.steps };
				},
			}),
		],
		stateModifier: plannerPrompt,
	});

///////////////////// Node Selection Agent /////////////////////
export const nodeSelectionAgent = (llm: BaseChatModel) =>
	createReactAgent({
		llm,
		tools: [
			new DynamicStructuredTool({
				name: 'select_n8n_nodes',
				description:
					'Match each workflow step with the most appropriate n8n nodes from the allowed list, ensuring they can implement the required functionality.',
				schema: z.object({
					steps: z
						.array(
							z.object({
								step: z.string().describe('The original workflow step description from the input'),
								recommended_nodes: z
									.array(z.string())
									.min(1)
									.max(3)
									.describe(
										'1-3 recommended n8n nodes for implementing this step, in order of descending preference. ONLY use nodes from the <allowed_n8n_nodes> list with EXACT full names from <node_name> tags.',
									),
								reasoning: z
									.string()
									.describe(
										'Brief explanation of why these nodes are suitable for implementing this step, including key capabilities',
									),
							}),
						)
						.describe('Mapping of each workflow step to the most appropriate n8n nodes'),
				}),
				func: async (input: {
					steps: Array<{ step: string; recommended_nodes: string[]; reasoning: string }>;
				}) => {
					return { steps: input.steps };
				},
			}),
		],
		stateModifier: nodeSelectorPrompt,
	});

///////////////////// Connection Composer Agent /////////////////////
export const connectionComposerAgent = (llm: BaseChatModel) =>
	createReactAgent({
		llm,
		tools: [
			new DynamicStructuredTool({
				name: 'compose_connections',
				description:
					"Create valid connections between n8n nodes to form a coherent, executable workflow that implements the user's request.",
				schema: z.object({
					connections: z
						.record(
							z
								.string()
								.describe(
									'The source node\'s display name exactly as specified in the node\'s "name" field',
								),
							z
								.object({
									main: z.array(
										z.array(
											z.object({
												node: z
													.string()
													.describe(
														'The target node\'s display name exactly as specified in the node\'s "name" field',
													),
												type: z
													.literal('main')
													.describe(
														'The connection type, always use "main" for standard n8n connections',
													),
												index: z
													.number()
													.describe(
														'Output index from the source node, typically 0 for single-output nodes, 0=true/1=false for IF nodes',
													),
											}),
										),
									),
								})
								.describe('The connection configuration for a single source node'),
						)
						.describe(
							'A mapping of all connections in the workflow, where each key is a source node name',
						),
				}),
				func: async (input) => {
					return { connections: input.connections };
				},
			}),
		],
		stateModifier: connectionComposerPrompt,
	});

///////////////////// Parameter Prefiller Agent /////////////////////
export const parameterPrefillerAgent = (llm: BaseChatModel) =>
	createReactAgent({
		llm,
		tools: [
			new DynamicStructuredTool({
				name: 'prefill_parameters',
				description:
					"Generate sensible default parameter values for each n8n node in the workflow based on the user's request.",
				schema: z.object({
					node_parameters: z
						.record(
							z.string().describe('The node\'s display name as specified in its "name" field'),
							z
								.object({})
								.passthrough()
								.describe(
									'An object containing parameter key-value pairs appropriate for this specific node type',
								),
						)
						.describe(
							"A mapping of all node parameters, where each key is a node name and each value is that node's parameter object",
						),
				}),
				func: async (input: { node_parameters: Record<string, object> }) => {
					return { node_parameters: input.node_parameters };
				},
			}),
		],
		stateModifier: parameterPrefillerPrompt,
	});

// Use Claude 3.5 Sonnet for the most complex part - node composition
const generateNodeConfigTool = new DynamicStructuredTool({
	name: 'generate_n8n_nodes',
	description:
		'Generate fully configured n8n nodes with appropriate parameters based on the workflow requirements and selected node types.',
	schema: z.object({
		nodes: z
			.array(
				z
					.object({
						parameters: z
							.record(z.string(), z.any())
							.describe(
								"The node's configuration parameters. Must include all required parameters for the node type to function properly. For expressions referencing other nodes, use the format: \"={{ $('Node Name').item.json.field }}\"",
							)
							.refine((data) => Object.keys(data).length > 0, {
								message: 'Parameters cannot be empty',
							}),
						type: z
							.string()
							.describe('The full node type identifier (e.g., "n8n-nodes-base.httpRequest")'),
						name: z
							.string()
							.describe(
								'A descriptive name for the node that clearly indicates its purpose in the workflow',
							),
					})
					.describe('A complete n8n node configuration'),
			)
			.describe('Array of all nodes for the workflow with their complete configurations'),
	}),
	func: async (input) => {
		return { nodes: input.nodes };
	},
});

export const nodesComposerChain = (llm: BaseChatModel) => {
	if (!llm.bindTools) {
		throw new OperationalError("LLM doesn't support binding tools");
	}

	return nodesComposerPrompt
		.pipe(
			llm.bindTools([generateNodeConfigTool], {
				tool_choice: 'generate_n8n_nodes',
			}),
		)
		.pipe((x: AIMessageChunk) => {
			const toolCall = x.tool_calls?.[0];
			return toolCall?.args.nodes as INodeTypeDescription[];
		});
};
