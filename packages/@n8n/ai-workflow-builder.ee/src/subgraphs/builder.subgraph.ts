import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { StructuredTool } from '@langchain/core/tools';
import { Annotation, StateGraph, END } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';

import { ReflectionAgent } from '@/agents/reflection.agent';
import { LLMServiceError } from '@/errors';
import { buildBuilderPrompt } from '@/prompts/agents/builder.prompt';
import { autoFixConnections } from '@/validation/auto-fix';
import { validateConnections } from '@/validation/checks';
import type { ProgrammaticViolation } from '@/validation/types';
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
import { createBuilderMetadata, createReflectionMetadata } from '../types/coordination';
import type { DiscoveryContext } from '../types/discovery-types';
import type { ReflectionResult } from '../types/reflection';
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
import { executeSubgraphTools, extractUserRequest } from '../utils/subgraph-helpers';

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

	// CRITIC Pattern: Reflection state fields
	// Track reflection attempts (limit to prevent infinite loops)
	reflectionCount: Annotation<number>({
		reducer: (x, y) => y ?? x,
		default: () => 0,
	}),

	// Current reflection result (passed to next agent call)
	reflectionContext: Annotation<ReflectionResult | null>({
		reducer: (x, y) => y ?? x,
		default: () => null,
	}),

	// Previous reflections in this session (reflection bank)
	previousReflections: Annotation<ReflectionResult[]>({
		reducer: (x, y) => x.concat(y),
		default: () => [],
	}),

	// Last validation violations (for reflection routing)
	lastValidationViolations: Annotation<ProgrammaticViolation[]>({
		reducer: (x, y) => y ?? x,
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

	private config?: BuilderSubgraphConfig;

	create(config: BuilderSubgraphConfig) {
		// Store config for use in transformOutput
		this.config = config;
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

		// CRITIC Pattern: Create reflection agent for analyzing validation failures
		const reflectionAgent = new ReflectionAgent({ llm: config.llm });
		const MAX_REFLECTION_ATTEMPTS = 2;

		/**
		 * Build reflection guidance block from reflection result
		 */
		const buildReflectionGuidanceBlock = (reflection: ReflectionResult): string => {
			const parts = [
				'=== REFLECTION GUIDANCE (from previous validation failure) ===',
				`Previous attempt failed: ${reflection.summary}`,
				`Root cause: ${reflection.rootCause}`,
				'Suggested fixes:',
				...reflection.suggestedFixes.map((f) => `- [${f.action}] ${f.guidance}`),
			];
			if (reflection.avoidStrategies.length > 0) {
				parts.push(`AVOID: ${reflection.avoidStrategies.join(', ')}`);
			}
			return parts.join('\n');
		};

		/**
		 * Agent node - calls builder agent
		 * Context is already in messages from transformInput
		 */
		const callAgent = async (state: typeof BuilderSubgraphState.State) => {
			// Apply cache markers to accumulated messages (for tool loop iterations)
			applySubgraphCacheMarkers(state.messages);

			// Add reflection guidance if available (CRITIC pattern)
			const messagesWithReflection = state.reflectionContext
				? [
						...state.messages,
						new HumanMessage({ content: buildReflectionGuidanceBlock(state.reflectionContext) }),
					]
				: state.messages;

			const response = await agent.invoke({
				messages: messagesWithReflection,
			});

			// Check if agent is making tool calls
			const hasToolCalls =
				'tool_calls' in response &&
				Array.isArray(response.tool_calls) &&
				response.tool_calls.length > 0;

			return {
				messages: [response],
				// Clear reflection context after use (it's been incorporated)
				reflectionContext: null,
				// Only clear violations if agent has tool calls (will be set again by validation tool)
				// Keep violations if agent is done so shouldContinue can route to reflection
				...(hasToolCalls ? { lastValidationViolations: [] } : {}),
			};
		};

		/**
		 * Reflection node - analyzes validation failures (CRITIC pattern)
		 */
		const reflect = async (state: typeof BuilderSubgraphState.State) => {
			const reflectionResult = await reflectionAgent.invoke({
				violations: state.lastValidationViolations,
				workflowJSON: state.workflowJSON,
				discoveryContext: state.discoveryContext,
				previousReflections: state.previousReflections,
				userRequest: state.userRequest,
			});

			return {
				reflectionContext: reflectionResult,
				previousReflections: [reflectionResult],
				reflectionCount: state.reflectionCount + 1,
			};
		};

		/**
		 * Should continue with tools, reflect on failures, or finish?
		 * CRITIC pattern: Route to reflection when validation fails
		 */
		const shouldContinue = (state: typeof BuilderSubgraphState.State) => {
			const lastMessage = state.messages[state.messages.length - 1];
			const hasToolCalls =
				lastMessage &&
				'tool_calls' in lastMessage &&
				Array.isArray(lastMessage.tool_calls) &&
				lastMessage.tool_calls.length > 0;

			if (hasToolCalls) {
				return 'tools';
			}

			// CRITIC pattern: Route to reflection if validation failed and under limit
			if (
				state.lastValidationViolations.length > 0 &&
				state.reflectionCount < MAX_REFLECTION_ATTEMPTS
			) {
				return 'reflect';
			}

			return END;
		};

		// Build the subgraph with reflection node (CRITIC pattern)
		const subgraph = new StateGraph(BuilderSubgraphState)
			.addNode('agent', callAgent)
			.addNode('tools', async (state) => await executeSubgraphTools(state, toolMap))
			.addNode('process_operations', processOperations)
			.addNode('reflect', reflect)
			.addEdge('__start__', 'agent')
			.addConditionalEdges('agent', shouldContinue, {
				tools: 'tools',
				reflect: 'reflect',
				[END]: END,
			})
			.addEdge('tools', 'process_operations')
			.addEdge('process_operations', 'agent')
			.addEdge('reflect', 'agent'); // After reflection, retry with guidance

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
		let workflowJSON = subgraphOutput.workflowJSON;
		let autoFixSummary: string | undefined;

		// Auto-fix missing AI connections before returning to parent
		if (this.config?.parsedNodeTypes) {
			const violations = validateConnections(workflowJSON, this.config.parsedNodeTypes);
			const autoFixResult = autoFixConnections(
				workflowJSON,
				this.config.parsedNodeTypes,
				violations,
			);

			if (autoFixResult.fixed.length > 0) {
				workflowJSON = {
					...workflowJSON,
					connections: autoFixResult.updatedConnections,
				};
				autoFixSummary = `Auto-fixed ${autoFixResult.fixed.length} connection(s): ${autoFixResult.fixed
					.map((fix) => `${fix.sourceNodeName} → ${fix.targetNodeName}`)
					.join(', ')}`;
			}
		}

		const nodes = workflowJSON.nodes;
		const connections = workflowJSON.connections;
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

		// Build coordination log entries
		const logEntries: CoordinationLogEntry[] = [];

		// CRITIC Pattern: Add reflection entries if any occurred
		if (subgraphOutput.previousReflections.length > 0) {
			for (let i = 0; i < subgraphOutput.previousReflections.length; i++) {
				const reflection = subgraphOutput.previousReflections[i];
				logEntries.push({
					phase: 'reflection',
					status: 'completed',
					timestamp: Date.now(),
					summary: reflection.summary,
					output: reflection.rootCause,
					metadata: createReflectionMetadata({
						violationsAnalyzed: subgraphOutput.lastValidationViolations.length,
						rootCauses: [reflection.category],
						attemptNumber: i + 1,
					}),
				});
			}
		}

		// Create builder coordination log entry
		const summary = autoFixSummary
			? `Created ${nodes.length} nodes with ${connectionCount} connections. ${autoFixSummary}`
			: `Created ${nodes.length} nodes with ${connectionCount} connections`;

		logEntries.push({
			phase: 'builder',
			status: 'completed',
			timestamp: Date.now(),
			summary,
			output: summaryText,
			metadata: createBuilderMetadata({
				nodesCreated: nodes.length,
				connectionsCreated: connectionCount,
				nodeNames: nodes.map((n) => n.name),
			}),
		});

		return {
			workflowJSON,
			workflowOperations: subgraphOutput.workflowOperations ?? [],
			coordinationLog: logEntries,
			cachedTemplates: subgraphOutput.cachedTemplates,
		};
	}
}
