import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage, AIMessage, ToolMessage } from '@langchain/core/messages';
import { isAIMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { Runnable } from '@langchain/core/runnables';
import { tool, type StructuredTool } from '@langchain/core/tools';
import { Annotation, StateGraph, END } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';
import { z } from 'zod';

import { LLMServiceError } from '@/errors';
import {
	buildDiscoveryPrompt,
	formatTechniqueList,
	formatExampleCategorizations,
} from '@/prompts/agents/discovery.prompt';
import type { BuilderFeatureFlags } from '@/workflow-builder-agent';

import { BaseSubgraph } from './subgraph-interface';
import type { ParentGraphState } from '../parent-graph-state';
import { createGetBestPracticesTool } from '../tools/get-best-practices.tool';
import { createGetWorkflowExamplesTool } from '../tools/get-workflow-examples.tool';
import { createNodeDetailsTool } from '../tools/node-details.tool';
import { createNodeSearchTool } from '../tools/node-search.tool';
import type { CoordinationLogEntry } from '../types/coordination';
import { createDiscoveryMetadata } from '../types/coordination';
import type { WorkflowMetadata } from '../types/tools';
import { applySubgraphCacheMarkers } from '../utils/cache-control';
import { buildWorkflowSummary, createContextMessage } from '../utils/context-builders';
import { appendArrayReducer, cachedTemplatesReducer } from '../utils/state-reducers';
import { executeSubgraphTools, extractUserRequest } from '../utils/subgraph-helpers';

/**
 * Strict Output Schema for Discovery
 * Simplified to reduce token usage while maintaining utility for downstream subgraphs
 */
const discoveryOutputSchema = z.object({
	nodesFound: z
		.array(
			z.object({
				nodeName: z.string().describe('The internal name of the node (e.g., n8n-nodes-base.gmail)'),
				version: z
					.number()
					.describe('The version number of the node (e.g., 1, 1.1, 2, 3, 3.2, etc.)'),
				reasoning: z.string().describe('Why this node is relevant for the workflow'),
				connectionChangingParameters: z
					.array(
						z.object({
							name: z
								.string()
								.describe('Parameter name (e.g., "mode", "operation", "hasOutputParser")'),
							possibleValues: z
								.array(z.union([z.string(), z.boolean(), z.number()]))
								.describe('Possible values this parameter can take'),
						}),
					)
					.describe(
						'Parameters that affect node connections (inputs/outputs). ONLY include if parameter appears in <input> or <output> expressions',
					),
			}),
		)
		.describe('List of n8n nodes identified as necessary for the workflow'),
});

/**
 * Discovery Subgraph State
 */
export const DiscoverySubgraphState = Annotation.Root({
	// Input: What the user wants to build
	userRequest: Annotation<string>({
		reducer: (x, y) => y ?? x,
		default: () => '',
	}),

	// Internal: Conversation within this subgraph
	messages: Annotation<BaseMessage[]>({
		reducer: (x, y) => x.concat(y),
		default: () => [],
	}),

	// Output: Found nodes with version, reasoning and connection-changing parameters
	nodesFound: Annotation<
		Array<{
			nodeName: string;
			version: number;
			reasoning: string;
			connectionChangingParameters: Array<{
				name: string;
				possibleValues: Array<string | boolean | number>;
			}>;
		}>
	>({
		reducer: (x, y) => y ?? x,
		default: () => [],
	}),

	// Output: Best practices documentation
	bestPractices: Annotation<string | undefined>({
		reducer: (x, y) => y ?? x,
	}),

	// Output: Template IDs fetched from workflow examples for telemetry
	templateIds: Annotation<number[]>({
		reducer: appendArrayReducer,
		default: () => [],
	}),

	// Cached workflow templates (passed from parent, updated by tools)
	cachedTemplates: Annotation<WorkflowMetadata[]>({
		reducer: cachedTemplatesReducer,
		default: () => [],
	}),
});

export interface DiscoverySubgraphConfig {
	parsedNodeTypes: INodeTypeDescription[];
	llm: BaseChatModel;
	logger?: Logger;
	featureFlags?: BuilderFeatureFlags;
}

export class DiscoverySubgraph extends BaseSubgraph<
	DiscoverySubgraphConfig,
	typeof DiscoverySubgraphState.State,
	typeof ParentGraphState.State
> {
	name = 'discovery_subgraph';
	description = 'Discovers nodes and context for the workflow';

	private agent!: Runnable;
	private toolMap!: Map<string, StructuredTool>;
	private logger?: Logger;

	create(config: DiscoverySubgraphConfig) {
		this.logger = config.logger;

		// Check if template examples are enabled
		const includeExamples = config.featureFlags?.templateExamples === true;

		// Create base tools
		const baseTools = [
			createGetBestPracticesTool(),
			createNodeSearchTool(config.parsedNodeTypes),
			createNodeDetailsTool(config.parsedNodeTypes, config.logger),
		];

		// Conditionally add workflow examples tool if feature flag is enabled
		const tools = includeExamples
			? [...baseTools, createGetWorkflowExamplesTool(config.logger)]
			: baseTools;

		this.toolMap = new Map(tools.map((bt) => [bt.tool.name, bt.tool]));

		// Define output tool
		const submitTool = tool(() => {}, {
			name: 'submit_discovery_results',
			description: 'Submit the final discovery results',
			schema: discoveryOutputSchema,
		});

		// Generate prompt based on feature flags
		const discoveryPrompt = buildDiscoveryPrompt({ includeExamples });

		// Create agent with tools bound (including submit tool)
		const systemPrompt = ChatPromptTemplate.fromMessages([
			[
				'system',
				[
					{
						type: 'text',
						text: discoveryPrompt,
						cache_control: { type: 'ephemeral' },
					},
				],
			],
			['human', '{prompt}'],
			['placeholder', '{messages}'],
		]);

		if (typeof config.llm.bindTools !== 'function') {
			throw new LLMServiceError('LLM does not support tools', {
				llmModel: config.llm._llmType(),
			});
		}

		// Bind all tools including the output tool
		const allTools = [...tools.map((bt) => bt.tool), submitTool];
		this.agent = systemPrompt.pipe(config.llm.bindTools(allTools));

		// Build the subgraph
		const subgraph = new StateGraph(DiscoverySubgraphState)
			.addNode('agent', this.callAgent.bind(this))
			.addNode('tools', async (state) => await executeSubgraphTools(state, this.toolMap))
			.addNode('format_output', this.formatOutput.bind(this))
			.addEdge('__start__', 'agent')
			// Conditional: tools if has tool calls, format_output if submit called
			.addConditionalEdges('agent', this.shouldContinue.bind(this), {
				tools: 'tools',
				format_output: 'format_output',
				end: END, // Fallback
			})
			.addEdge('tools', 'agent') // After tools, go back to agent
			.addEdge('format_output', END); // After formatting, END

		return subgraph.compile();
	}

	/**
	 * Agent node - calls discovery agent
	 * Context is already in messages from transformInput
	 */
	private async callAgent(state: typeof DiscoverySubgraphState.State) {
		// Apply cache markers to accumulated messages (for tool loop iterations)
		if (state.messages.length > 0) {
			applySubgraphCacheMarkers(state.messages);
		}

		// Messages already contain context from transformInput
		const response = (await this.agent.invoke({
			messages: state.messages,
			prompt: state.userRequest,
			techniques: formatTechniqueList(),
			exampleCategorizations: formatExampleCategorizations(),
		})) as AIMessage;

		return { messages: [response] };
	}

	/**
	 * Format the output from the submit tool call
	 * No hydration - just return raw node names. Subgraphs will hydrate if needed.
	 */
	private formatOutput(state: typeof DiscoverySubgraphState.State) {
		const lastMessage = state.messages.at(-1);
		let output: z.infer<typeof discoveryOutputSchema> | undefined;

		if (lastMessage && isAIMessage(lastMessage) && lastMessage.tool_calls) {
			const submitCall = lastMessage.tool_calls.find(
				(tc) => tc.name === 'submit_discovery_results',
			);
			if (submitCall) {
				output = submitCall.args as z.infer<typeof discoveryOutputSchema>;
			}
		}

		if (!output) {
			this.logger?.error('[Discovery] No submit tool call found in last message');
			return {
				nodesFound: [],
				templateIds: [],
			};
		}

		const bestPracticesTool = state.messages.find(
			(m): m is ToolMessage => m.getType() === 'tool' && m?.text?.startsWith('<best_practices>'),
		);

		// Return raw output without hydration, including templateIds from workflow examples
		return {
			nodesFound: output.nodesFound,
			bestPractices: bestPracticesTool?.text,
			templateIds: state.templateIds ?? [],
		};
	}

	/**
	 * Should continue with tools or finish?
	 */
	private shouldContinue(state: typeof DiscoverySubgraphState.State) {
		const lastMessage = state.messages[state.messages.length - 1];

		if (
			lastMessage &&
			isAIMessage(lastMessage) &&
			lastMessage.tool_calls &&
			lastMessage.tool_calls.length > 0
		) {
			// Check if the submit tool was called
			const submitCall = lastMessage.tool_calls.find(
				(tc) => tc.name === 'submit_discovery_results',
			);
			if (submitCall) {
				return 'format_output';
			}
			return 'tools';
		}

		// No tool calls = agent is done (or failed to call tool)
		// In this pattern, we expect a tool call. If none, we might want to force it or just end.
		// For now, let's treat it as an end, but ideally we'd reprompt.
		this.logger?.warn('[Discovery Subgraph] Agent stopped without submitting results');
		return 'end';
	}

	transformInput(parentState: typeof ParentGraphState.State) {
		const userRequest = extractUserRequest(parentState.messages, 'Build a workflow');

		// Build context parts for Discovery
		const contextParts: string[] = [];

		// 1. User request (primary)
		contextParts.push('<user_request>');
		contextParts.push(userRequest);
		contextParts.push('</user_request>');

		// 2. Current workflow summary (just node names, to know what exists)
		// Discovery doesn't need full JSON, just awareness of existing nodes
		if (parentState.workflowJSON.nodes.length > 0) {
			contextParts.push('<existing_workflow_summary>');
			contextParts.push(buildWorkflowSummary(parentState.workflowJSON));
			contextParts.push('</existing_workflow_summary>');
		}

		// Create initial message with context
		const contextMessage = createContextMessage(contextParts);

		return {
			userRequest,
			messages: [contextMessage], // Context already in messages
			cachedTemplates: parentState.cachedTemplates,
		};
	}

	transformOutput(
		subgraphOutput: typeof DiscoverySubgraphState.State,
		_parentState: typeof ParentGraphState.State,
	) {
		const nodesFound = subgraphOutput.nodesFound || [];
		const templateIds = subgraphOutput.templateIds || [];
		const discoveryContext = {
			nodesFound,
			bestPractices: subgraphOutput.bestPractices,
		};

		// Create coordination log entry (not a message)
		const logEntry: CoordinationLogEntry = {
			phase: 'discovery',
			status: 'completed',
			timestamp: Date.now(),
			summary: `Discovered ${nodesFound.length} nodes`,
			metadata: createDiscoveryMetadata({
				nodesFound: nodesFound.length,
				nodeTypes: nodesFound.map((n) => n.nodeName),
				hasBestPractices: !!subgraphOutput.bestPractices,
			}),
		};

		return {
			discoveryContext,
			coordinationLog: [logEntry],
			// Pass template IDs for telemetry
			templateIds,
			// Propagate cached templates back to parent
			cachedTemplates: subgraphOutput.cachedTemplates,
		};
	}
}
