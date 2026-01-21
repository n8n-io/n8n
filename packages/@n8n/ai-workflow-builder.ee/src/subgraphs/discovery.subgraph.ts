import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage, AIMessage } from '@langchain/core/messages';
import { HumanMessage, isAIMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { Runnable } from '@langchain/core/runnables';
import { tool, type StructuredTool } from '@langchain/core/tools';
import { Annotation, StateGraph, END, START } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';
import { z } from 'zod';

import { LLMServiceError } from '@/errors';
import {
	buildDiscoveryPrompt,
	formatExampleCategorizations,
	formatTechniqueList,
} from '@/prompts/agents/discovery.prompt';
import type { BuilderFeatureFlags } from '@/workflow-builder-agent';

import { BaseSubgraph } from './subgraph-interface';
import type { ParentGraphState } from '../parent-graph-state';
import { createGetDocumentationTool } from '../tools/get-documentation.tool';
import { createGetWorkflowExamplesTool } from '../tools/get-workflow-examples.tool';
import { createNodeDetailsTool } from '../tools/node-details.tool';
import { createNodeSearchTool } from '../tools/node-search.tool';
import type { CoordinationLogEntry } from '../types/coordination';
import { createDiscoveryMetadata } from '../types/coordination';
import type { WorkflowMetadata } from '../types/tools';
import { applySubgraphCacheMarkers } from '../utils/cache-control';
import { buildWorkflowSummary, createContextMessage } from '../utils/context-builders';
import { hydrateNodes } from '../utils/node-hydration';
import type { ResourceOperationInfo } from '../utils/resource-operation-extractor';
import { appendArrayReducer, cachedTemplatesReducer } from '../utils/state-reducers';
import { executeSubgraphTools } from '../utils/subgraph-helpers';

/**
 * Strict Output Schema for Discovery
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
 * Focused solely on discovering nodes for build mode.
 */
export const DiscoverySubgraphState = Annotation.Root({
	// Input
	userRequest: Annotation<string>({
		reducer: (x, y) => y ?? x,
		default: () => '',
	}),
	existingWorkflowSummary: Annotation<string>({
		reducer: (x, y) => y ?? x,
		default: () => '',
	}),

	// Internal
	messages: Annotation<BaseMessage[]>({
		reducer: (x, y) => x.concat(y),
		default: () => [],
	}),

	// Output
	nodesFound: Annotation<
		Array<{
			nodeName: string;
			version: number;
			reasoning: string;
			connectionChangingParameters: Array<{
				name: string;
				possibleValues: Array<string | boolean | number>;
			}>;
			availableResources?: Array<{
				value: string;
				displayName: string;
				operations: Array<{
					value: string;
					displayName: string;
				}>;
			}>;
		}>
	>({
		reducer: (x, y) => y ?? x,
		default: () => [],
	}),
	bestPractices: Annotation<string | undefined>({
		reducer: (x, y) => y ?? x,
	}),
	templateIds: Annotation<number[]>({
		reducer: appendArrayReducer,
		default: () => [],
	}),

	// Cache
	cachedTemplates: Annotation<WorkflowMetadata[]>({
		reducer: cachedTemplatesReducer,
		default: () => [],
	}),
	resourceOperationCache: Annotation<Record<string, ResourceOperationInfo | null>>({
		reducer: (x, y) => ({ ...x, ...y }),
		default: () => ({}),
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

	private discoveryAgent!: Runnable;
	private toolMap!: Map<string, StructuredTool>;
	private logger?: Logger;
	private parsedNodeTypes!: INodeTypeDescription[];

	create(config: DiscoverySubgraphConfig) {
		this.logger = config.logger;
		this.parsedNodeTypes = config.parsedNodeTypes;

		const includeExamples = config.featureFlags?.templateExamples === true;

		const baseTools = [
			createGetDocumentationTool(),
			createNodeSearchTool(config.parsedNodeTypes),
			createNodeDetailsTool(config.parsedNodeTypes, config.logger),
		];

		const tools = includeExamples
			? [...baseTools, createGetWorkflowExamplesTool(config.logger)]
			: baseTools;

		this.toolMap = new Map(tools.map((bt) => [bt.tool.name, bt.tool]));

		const submitDiscoveryTool = tool(() => {}, {
			name: 'submit_discovery_results',
			description: 'Submit the final discovery results',
			schema: discoveryOutputSchema,
		});

		const discoveryPrompt = buildDiscoveryPrompt({ includeExamples });

		const discoverySystemPrompt = ChatPromptTemplate.fromMessages([
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

		const discoveryAllTools = [...tools.map((bt) => bt.tool), submitDiscoveryTool];
		this.discoveryAgent = discoverySystemPrompt.pipe(config.llm.bindTools(discoveryAllTools));

		const subgraph = new StateGraph(DiscoverySubgraphState)
			.addNode('agent', this.callAgent.bind(this))
			.addNode('tools', async (state) => await executeSubgraphTools(state, this.toolMap))
			.addNode('format_output', this.formatOutput.bind(this))
			.addEdge(START, 'agent')
			.addConditionalEdges('agent', this.shouldContinue.bind(this), {
				tools: 'tools',
				format_output: 'format_output',
				end: END,
			})
			.addEdge('tools', 'agent')
			.addEdge('format_output', END);

		return subgraph.compile();
	}

	private async callAgent(state: typeof DiscoverySubgraphState.State) {
		if (state.messages.length > 0) {
			applySubgraphCacheMarkers(state.messages);
		}

		const response = (await this.discoveryAgent.invoke({
			messages: state.messages,
			prompt: state.userRequest,
			techniques: formatTechniqueList(),
			exampleCategorizations: formatExampleCategorizations(),
		})) as AIMessage;

		return { messages: [response] };
	}

	private shouldContinue(state: typeof DiscoverySubgraphState.State) {
		const lastMessage = state.messages[state.messages.length - 1];

		if (
			lastMessage &&
			isAIMessage(lastMessage) &&
			lastMessage.tool_calls &&
			lastMessage.tool_calls.length > 0
		) {
			const submitCall = lastMessage.tool_calls.find(
				(tc) => tc.name === 'submit_discovery_results',
			);
			if (submitCall) {
				return 'format_output';
			}
			return 'tools';
		}

		this.logger?.warn('[Discovery] Agent stopped without calling an output tool');
		return 'end';
	}

	private formatOutput(state: typeof DiscoverySubgraphState.State) {
		const lastMessage = state.messages.at(-1);
		let output: z.infer<typeof discoveryOutputSchema> | undefined;

		if (lastMessage && isAIMessage(lastMessage) && lastMessage.tool_calls) {
			const submitCall = lastMessage.tool_calls.find(
				(tc) => tc.name === 'submit_discovery_results',
			);
			if (submitCall) {
				const parseResult = discoveryOutputSchema.safeParse(submitCall.args);
				if (!parseResult.success) {
					this.logger?.error(
						'[Discovery] Invalid discovery output schema - returning empty results',
						{ errors: parseResult.error.errors },
					);
					return { nodesFound: [], templateIds: [] };
				}
				output = parseResult.data;
			}
		}

		if (!output) {
			return { nodesFound: [], templateIds: [] };
		}

		// Use shared hydration utility
		const hydratedNodesFound = hydrateNodes(
			output.nodesFound,
			this.parsedNodeTypes,
			state.resourceOperationCache,
			this.logger,
		);

		return {
			nodesFound: hydratedNodesFound,
			bestPractices: state.bestPractices,
			templateIds: state.templateIds ?? [],
		};
	}

	transformInput(parentState: typeof ParentGraphState.State) {
		// Standard Discovery Input (Build Mode only)
		const userRequest =
			(parentState.messages
				.filter(
					(m) =>
						m instanceof HumanMessage && typeof m.content === 'string' && m.content.trim() !== '',
				)
				.pop()?.content as string) || '';

		const contextParts: string[] = [];
		contextParts.push('<user_request>');
		contextParts.push(userRequest);
		contextParts.push('</user_request>');

		let existingWorkflowSummary = '';
		if (parentState.workflowJSON.nodes.length > 0) {
			existingWorkflowSummary = buildWorkflowSummary(parentState.workflowJSON);
			contextParts.push('<existing_workflow_summary>');
			contextParts.push(existingWorkflowSummary);
			contextParts.push('</existing_workflow_summary>');
		}

		const contextMessage = createContextMessage(contextParts);

		return {
			userRequest,
			messages: [contextMessage],
			cachedTemplates: parentState.cachedTemplates,
			existingWorkflowSummary,
		};
	}

	transformOutput(
		subgraphOutput: typeof DiscoverySubgraphState.State,
		_parentState: typeof ParentGraphState.State,
	) {
		const nodesFound = subgraphOutput.nodesFound || [];
		const templateIds = subgraphOutput.templateIds || [];

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
			discoveryContext: {
				nodesFound,
				bestPractices: subgraphOutput.bestPractices,
			},
			templateIds,
			cachedTemplates: subgraphOutput.cachedTemplates,
			coordinationLog: [logEntry],
		};
	}
}
