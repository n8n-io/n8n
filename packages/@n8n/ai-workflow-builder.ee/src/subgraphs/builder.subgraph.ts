import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { StructuredTool } from '@langchain/core/tools';
import { Annotation, StateGraph } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';

import { LLMServiceError } from '@/errors';
import { buildBuilderPrompt } from '@/prompts/agents/builder.prompt';
import type { BuilderFeatureFlags, ChatPayload } from '@/workflow-builder-agent';

import { BaseSubgraph } from './subgraph-interface';
import type { ParentGraphState } from '../parent-graph-state';
import { createAddNodeTool } from '../tools/add-node.tool';
import { createConnectNodesTool } from '../tools/connect-nodes.tool';
import { createGetNodeConnectionExamplesTool } from '../tools/get-node-examples.tool';
import { createRemoveConnectionTool } from '../tools/remove-connection.tool';
import { createRemoveNodeTool } from '../tools/remove-node.tool';
import { createRenameNodeTool } from '../tools/rename-node.tool';
import { createValidateStructureTool } from '../tools/validate-structure.tool';
import type { CoordinationLogEntry } from '../types/coordination';
import { createBuilderMetadata } from '../types/coordination';
import type { DiscoveryContext } from '../types/discovery-types';
import type { WorkflowMetadata } from '../types/tools';
import type { SimpleWorkflow, WorkflowOperation } from '../types/workflow';
import { applySubgraphCacheMarkers } from '../utils/cache-control';
import {
	buildDiscoveryContextBlock,
	buildWorkflowJsonBlock,
	buildExecutionSchemaBlock,
	createContextMessage,
} from '../utils/context-builders';
import { processOperations } from '../utils/operations-processor';
import { cachedTemplatesReducer } from '../utils/state-reducers';
import {
	executeSubgraphTools,
	extractUserRequest,
	createStandardShouldContinue,
} from '../utils/subgraph-helpers';

/**
 * Builder Subgraph State
 */
export const BuilderSubgraphState = Annotation.Root({
	// Input: Current workflow to modify
	workflowJSON: Annotation<SimpleWorkflow>({
		reducer: (x, y) => y ?? x,
		default: () => ({ nodes: [], connections: {}, name: '' }),
	}),

	// Input: What user wants
	userRequest: Annotation<string>({
		reducer: (x, y) => y ?? x,
		default: () => '',
	}),

	// Input: Execution context (optional)
	workflowContext: Annotation<ChatPayload['workflowContext'] | undefined>({
		reducer: (x, y) => y ?? x,
	}),

	// Input: Discovery context from parent
	discoveryContext: Annotation<DiscoveryContext | null>({
		reducer: (x, y) => y ?? x,
		default: () => null,
	}),

	// Internal: Conversation
	messages: Annotation<BaseMessage[]>({
		reducer: (x, y) => x.concat(y),
		default: () => [],
	}),

	// Internal: Operations queue
	workflowOperations: Annotation<WorkflowOperation[] | null>({
		reducer: (x, y) => {
			if (y === null) return [];
			if (!y || y.length === 0) return x ?? [];
			return [...(x ?? []), ...y];
		},
		default: () => [],
	}),

	// Cached workflow templates (passed from parent, updated by tools)
	cachedTemplates: Annotation<WorkflowMetadata[]>({
		reducer: cachedTemplatesReducer,
		default: () => [],
	}),
});

export interface BuilderSubgraphConfig {
	parsedNodeTypes: INodeTypeDescription[];
	llm: BaseChatModel;
	logger?: Logger;
	featureFlags?: BuilderFeatureFlags;
}

export class BuilderSubgraph extends BaseSubgraph<
	BuilderSubgraphConfig,
	typeof BuilderSubgraphState.State,
	typeof ParentGraphState.State
> {
	name = 'builder_subgraph';
	description = 'Constructs workflow structure: creating nodes and connections';

	create(config: BuilderSubgraphConfig) {
		// Check if template examples are enabled
		const includeExamples = config.featureFlags?.templateExamples === true;

		// Create base tools
		const baseTools = [
			createAddNodeTool(config.parsedNodeTypes),
			createConnectNodesTool(config.parsedNodeTypes, config.logger),
			createRemoveNodeTool(config.logger),
			createRemoveConnectionTool(config.logger),
			createRenameNodeTool(config.logger),
			createValidateStructureTool(config.parsedNodeTypes),
		];

		// Conditionally add node connection examples tool if feature flag is enabled
		const tools = includeExamples
			? [...baseTools, createGetNodeConnectionExamplesTool(config.logger)]
			: baseTools;
		const toolMap = new Map<string, StructuredTool>(tools.map((bt) => [bt.tool.name, bt.tool]));
		// Create agent with tools bound
		const systemPrompt = ChatPromptTemplate.fromMessages([
			[
				'system',
				[
					{
						type: 'text',
						text: buildBuilderPrompt(),
						cache_control: { type: 'ephemeral' },
					},
				],
			],
			['placeholder', '{messages}'],
		]);
		if (typeof config.llm.bindTools !== 'function') {
			throw new LLMServiceError('LLM does not support tools', {
				llmModel: config.llm._llmType(),
			});
		}
		const agent = systemPrompt.pipe(config.llm.bindTools(tools.map((bt) => bt.tool)));

		/**
		 * Agent node - calls builder agent
		 * Context is already in messages from transformInput
		 */
		const callAgent = async (state: typeof BuilderSubgraphState.State) => {
			// Apply cache markers to accumulated messages (for tool loop iterations)
			applySubgraphCacheMarkers(state.messages);

			// Messages already contain context from transformInput
			const response = await agent.invoke({
				messages: state.messages,
			});

			return { messages: [response] };
		};

		/**
		 * Should continue with tools or finish?
		 */
		const shouldContinue = createStandardShouldContinue();

		// Build the subgraph
		const subgraph = new StateGraph(BuilderSubgraphState)
			.addNode('agent', callAgent)
			.addNode('tools', async (state) => await executeSubgraphTools(state, toolMap))
			.addNode('process_operations', processOperations)
			.addEdge('__start__', 'agent')
			// Map 'tools' to tools node, END is handled automatically
			.addConditionalEdges('agent', shouldContinue)
			.addEdge('tools', 'process_operations')
			.addEdge('process_operations', 'agent'); // Loop back to agent

		return subgraph.compile();
	}

	transformInput(parentState: typeof ParentGraphState.State) {
		const userRequest = extractUserRequest(parentState.messages);

		// Build context parts for Builder
		const contextParts: string[] = [];

		// 1. User request (primary)
		contextParts.push('=== USER REQUEST ===');
		contextParts.push(userRequest);

		// 2. Discovery context (what nodes to use)
		if (parentState.discoveryContext) {
			contextParts.push('=== DISCOVERY CONTEXT ===');
			contextParts.push(buildDiscoveryContextBlock(parentState.discoveryContext, true));
		}

		// 3. Current workflow JSON (to add nodes to)
		contextParts.push('=== CURRENT WORKFLOW ===');
		if (parentState.workflowJSON.nodes.length > 0) {
			contextParts.push(buildWorkflowJsonBlock(parentState.workflowJSON));
		} else {
			contextParts.push('Empty workflow - ready to build');
		}

		// 4. Execution schema (data types available, NOT full data)
		const schemaBlock = buildExecutionSchemaBlock(parentState.workflowContext);
		if (schemaBlock) {
			contextParts.push('=== AVAILABLE DATA SCHEMA ===');
			contextParts.push(schemaBlock);
		}

		// Create initial message with context
		const contextMessage = createContextMessage(contextParts);

		return {
			userRequest,
			workflowJSON: parentState.workflowJSON,
			workflowContext: parentState.workflowContext,
			discoveryContext: parentState.discoveryContext,
			messages: [contextMessage], // Context already in messages
			cachedTemplates: parentState.cachedTemplates,
		};
	}

	transformOutput(
		subgraphOutput: typeof BuilderSubgraphState.State,
		_parentState: typeof ParentGraphState.State,
	) {
		const nodes = subgraphOutput.workflowJSON.nodes;
		const connections = subgraphOutput.workflowJSON.connections;
		const connectionCount = Object.values(connections).flat().length;

		// Extract builder's actual summary (last message without tool calls)
		const builderSummary = subgraphOutput.messages
			.slice()
			.reverse()
			.find(
				(m) =>
					m.content &&
					(!('tool_calls' in m) ||
						!m.tool_calls ||
						(m.tool_calls && Array.isArray(m.tool_calls) && m.tool_calls.length === 0)),
			);

		const summaryText =
			typeof builderSummary?.content === 'string' ? builderSummary.content : undefined;

		// Create coordination log entry (not a message)
		const logEntry: CoordinationLogEntry = {
			phase: 'builder',
			status: 'completed',
			timestamp: Date.now(),
			summary: `Created ${nodes.length} nodes with ${connectionCount} connections`,
			output: summaryText,
			metadata: createBuilderMetadata({
				nodesCreated: nodes.length,
				connectionsCreated: connectionCount,
				nodeNames: nodes.map((n) => n.name),
			}),
		};

		return {
			workflowJSON: subgraphOutput.workflowJSON,
			workflowOperations: subgraphOutput.workflowOperations ?? [],
			coordinationLog: [logEntry],
			cachedTemplates: subgraphOutput.cachedTemplates,
		};
	}
}
