/**
 * Claude Agent SDK Implementation of Workflow Builder
 *
 * This is an alternative, simpler implementation using the Claude Agent SDK
 * instead of LangGraph. It provides a more straightforward architecture with
 * automatic agent routing and built-in session management.
 *
 * Key differences from LangGraph implementation:
 * - Simpler code (~500 lines vs ~1500 lines)
 * - Automatic routing via agent descriptions (less control but easier)
 * - State managed in instance fields (no explicit StateGraph)
 * - In-process MCP tools (no separate tool execution logic)
 * - Natural conversation flow (context via history, not explicit passing)
 *
 * Trade-offs:
 * Pros: Much simpler, easier to extend, built-in features
 * Cons: Less routing control, no explicit state isolation, harder to evaluate per-stage
 *
 * NOTE: This is a PoC implementation showing the structure. The actual SDK integration
 * is commented out until @anthropic-ai/claude-agent-sdk is installed as a dependency.
 * Many variables are currently unused but will be used when the SDK is integrated.
 */

import {
	query,
	tool,
	createSdkMcpServer,
	type AgentDefinition,
	type SDKMessage,
} from '@anthropic-ai/claude-agent-sdk';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';
import { z } from 'zod';

import {
	SDK_BUILDER_PROMPT,
	SDK_CONFIGURATOR_PROMPT,
	SDK_DISCOVERY_PROMPT,
	SDK_ORCHESTRATOR_PROMPT,
} from './prompts/sdk-prompts';
import type { SimpleWorkflow } from './types/workflow';
import type { ChatPayload } from './workflow-builder-agent';

export interface WorkflowBuilderAgentClaudeConfig {
	parsedNodeTypes: INodeTypeDescription[];
	logger?: Logger;
	instanceUrl?: string;
	/**
	 * API key for Claude (required for SDK)
	 */
	apiKey?: string;
	/**
	 * Model to use for all agents (default: sonnet-4.5)
	 */
	model?: string;
}

/**
 * Workflow Builder Agent using Claude Agent SDK
 *
 * This class provides a simpler alternative to the LangGraph implementation
 * by using Claude's Agent SDK for orchestration, routing, and tool execution.
 */
export class WorkflowBuilderAgentClaude {
	// State lives in instance fields
	private workflowJSON: SimpleWorkflow;
	private workflowContext: ChatPayload['workflowContext'] | null;
	private parsedNodeTypes: INodeTypeDescription[];
	private logger?: Logger;
	// TODO: These will be used for webhook URLs and API key configuration
	private instanceUrl?: string;
	private apiKey?: string;
	private model: string;

	constructor(config: WorkflowBuilderAgentClaudeConfig) {
		this.parsedNodeTypes = config.parsedNodeTypes;
		this.logger = config.logger;
		this.instanceUrl = config.instanceUrl;
		this.apiKey = config.apiKey;
		this.model = config.model ?? 'claude-sonnet-4-5';

		// Initialize empty workflow
		this.workflowJSON = { nodes: [], connections: {}, name: '' };
		this.workflowContext = null;
	}

	/**
	 * Main chat method - builds workflows based on user requests
	 *
	 * This is the public API that matches the LangGraph implementation's signature
	 * for easy drop-in replacement.
	 */
	async *chat(
		payload: ChatPayload,
		_userId?: string,
		_abortSignal?: AbortSignal,
	): AsyncGenerator<any, void> {
		// Initialize state from payload
		if (payload.workflowContext?.currentWorkflow) {
			this.workflowJSON = payload.workflowContext.currentWorkflow as SimpleWorkflow;
		}
		this.workflowContext = payload.workflowContext ?? null;

		this.logger?.info('[SDK] Building workflow', {
			userMessage: payload.message.substring(0, 100),
			currentNodeCount: this.workflowJSON.nodes.length,
		});

		// Create MCP server with workflow tools
		const workflowMcp = createSdkMcpServer({
			name: 'workflow-builder',
			version: '1.0.0',
			tools: this.createWorkflowTools(),
		});

		// Tool names for allowed tools
		const workflowToolNames = [
			'search_node_types',
			'get_node_details',
			'add_workflow_node',
			'connect_nodes',
			'set_node_parameters',
			'get_workflow_context',
		];

		// Query with subagents and tools
		const result = query({
			prompt: payload.message,
			options: {
				systemPrompt: {
					type: 'preset',
					preset: 'claude_code',
					append: SDK_ORCHESTRATOR_PROMPT,
				},
				agents: this.defineSubagents(),
				mcpServers: {
					'workflow-builder': workflowMcp,
				},
				model: this.model,
				maxTurns: 20,
				allowedTools: ['Task', ...workflowToolNames],
			},
		});

		// Stream responses and yield workflow updates
		for await (const message of result) {
			// Transform SDK messages to match existing output format
			const output = this.transformSDKMessage(message);
			if (output) yield output;

			// Also yield workflow updates
			yield {
				type: 'workflow_update',
				workflowJSON: this.workflowJSON,
			};
		}
	}

	/**
	 * Define subagents for workflow building
	 *
	 * These match the LangGraph subgraphs but are defined as simple objects
	 * for the SDK to use automatically based on task matching.
	 */
	private defineSubagents(): Record<string, AgentDefinition> {
		return {
			discovery: {
				description:
					'MUST USE when user describes what they want and you need to find relevant n8n nodes. Use proactively for any workflow building request before creating nodes.',
				prompt: SDK_DISCOVERY_PROMPT,
				tools: ['search_node_types', 'get_node_details', 'get_workflow_context'],
				model: 'sonnet',
			},

			builder: {
				description:
					'MUST USE after discovery to create workflow structure. Use when you have identified nodes and need to add them to the workflow and connect them.',
				prompt: SDK_BUILDER_PROMPT,
				tools: ['add_workflow_node', 'connect_nodes', 'get_workflow_context'],
				model: 'sonnet',
			},

			configurator: {
				description:
					'MUST USE after building to configure node parameters. Use when workflow structure exists but nodes need parameter configuration.',
				prompt: SDK_CONFIGURATOR_PROMPT,
				tools: ['set_node_parameters', 'get_workflow_context'],
				model: 'sonnet',
			},
		};
	}

	/**
	 * Create workflow manipulation tools as SDK MCP tools
	 *
	 * These are closures over instance state, so they can mutate workflowJSON directly.
	 * This is the equivalent of the LangGraph tools but wrapped in SDK's MCP format.
	 */
	private createWorkflowTools() {
		return [
			// Search for node types
			tool(
				'search_node_types',
				'Search for n8n nodes by keyword or capability',
				{
					query: z.string().describe('Search query (e.g., "Gmail", "HTTP", "database")'),
				},
				async (args) => {
					const results = this.parsedNodeTypes
						.filter(
							(node) =>
								node.displayName.toLowerCase().includes(args.query.toLowerCase()) ||
								node.description.toLowerCase().includes(args.query.toLowerCase()),
						)
						.slice(0, 10);

					return {
						content: [
							{
								type: 'text' as const,
								text: JSON.stringify({
									results: results.map((n) => ({
										name: n.name,
										displayName: n.displayName,
										description: n.description,
									})),
								}),
							},
						],
					};
				},
			),

			// Get node details
			tool(
				'get_node_details',
				'Get complete schema and documentation for a specific node type',
				{
					nodeType: z.string().describe('Node type name (e.g., "n8n-nodes-base.httpRequest")'),
				},
				async (args) => {
					const node = this.parsedNodeTypes.find((n) => n.name === args.nodeType);

					if (!node) {
						return {
							content: [
								{
									type: 'text' as const,
									text: JSON.stringify({ error: 'Node type not found' }),
								},
							],
							isError: true,
						};
					}

					return {
						content: [
							{
								type: 'text' as const,
								text: JSON.stringify({
									node: {
										name: node.name,
										displayName: node.displayName,
										description: node.description,
										properties: node.properties,
										inputs: node.inputs,
										outputs: node.outputs,
									},
								}),
							},
						],
					};
				},
			),

			// Add workflow node
			tool(
				'add_workflow_node',
				'Add a node to the workflow',
				{
					nodeType: z.string().describe('Node type name'),
					name: z.string().describe('Human-readable node name'),
					position: z
						.object({
							x: z.number(),
							y: z.number(),
						})
						.optional()
						.describe('Position on canvas (optional)'),
				},
				async (args) => {
					// Mutate instance state
					const nodeId = `node-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

					this.workflowJSON.nodes.push({
						id: nodeId,
						name: args.name,
						type: args.nodeType,
						position: args.position ?? [0, 0],
						parameters: {},
						typeVersion: 1,
					} as any);

					this.logger?.debug('[SDK Tool] Added node', {
						nodeId,
						nodeType: args.nodeType,
						name: args.name,
					});

					return {
						content: [
							{
								type: 'text' as const,
								text: JSON.stringify({
									success: true,
									nodeId,
									currentWorkflow: this.workflowJSON,
								}),
							},
						],
					};
				},
			),

			// Connect nodes
			tool(
				'connect_nodes',
				'Connect two nodes in the workflow',
				{
					sourceNodeId: z.string().describe('Source node ID'),
					targetNodeId: z.string().describe('Target node ID'),
					outputIndex: z.number().default(0).describe('Source output index'),
					inputIndex: z.number().default(0).describe('Target input index'),
					connectionType: z
						.string()
						.default('main')
						.describe('Connection type (main, ai_languageModel, etc.)'),
				},
				async (args) => {
					// Mutate instance state
					if (!this.workflowJSON.connections[args.sourceNodeId]) {
						this.workflowJSON.connections[args.sourceNodeId] = {};
					}

					const outputKey = args.connectionType === 'main' ? 'main' : args.connectionType;

					if (!this.workflowJSON.connections[args.sourceNodeId][outputKey]) {
						this.workflowJSON.connections[args.sourceNodeId][outputKey] = [];
					}

					this.workflowJSON.connections[args.sourceNodeId][outputKey].push({
						// @ts-ignore: Ok
						node: args.targetNodeId,
						type: args.connectionType,
						index: args.inputIndex,
					});

					this.logger?.debug('[SDK Tool] Connected nodes', {
						source: args.sourceNodeId,
						target: args.targetNodeId,
						type: args.connectionType,
					});

					return {
						content: [
							{
								type: 'text' as const,
								text: JSON.stringify({
									success: true,
									currentWorkflow: this.workflowJSON,
								}),
							},
						],
					};
				},
			),

			// Set node parameters
			tool(
				'set_node_parameters',
				'Configure parameters for a node',
				{
					nodeId: z.string().describe('Node ID to configure'),
					instructions: z.string().describe('Natural language instructions for what to configure'),
				},
				async (args) => {
					// Find the node
					const node = this.workflowJSON.nodes.find((n) => n.id === args.nodeId);

					if (!node) {
						return {
							content: [
								{
									type: 'text' as const,
									text: JSON.stringify({ error: 'Node not found' }),
								},
							],
							isError: true,
						};
					}

					// TODO: Parse instructions and update parameters
					// For now, this is a placeholder
					// In real implementation, would use an LLM chain to parse instructions
					// similar to the updateNodeParametersTool

					this.logger?.debug('[SDK Tool] Set node parameters', {
						nodeId: args.nodeId,
						instructions: args.instructions,
					});

					return {
						content: [
							{
								type: 'text' as const,
								text: JSON.stringify({
									success: true,
									nodeId: args.nodeId,
									message: 'Parameters would be updated here (placeholder)',
								}),
							},
						],
					};
				},
			),

			// Get workflow context
			tool(
				'get_workflow_context',
				'Get current workflow structure, execution data, and node schemas',
				{},
				async () => {
					return {
						content: [
							{
								type: 'text' as const,
								text: JSON.stringify({
									workflowJSON: this.workflowJSON,
									executionData: this.workflowContext?.executionData ?? {},
									executionSchema: this.workflowContext?.executionSchema ?? [],
									nodeCount: this.workflowJSON.nodes.length,
									connectionCount: Object.keys(this.workflowJSON.connections).length,
								}),
							},
						],
					};
				},
			),
		];
	}

	/**
	 * Transform SDK messages to match existing output format
	 *
	 * This ensures compatibility with the existing frontend that expects
	 * specific message formats from the LangGraph implementation.
	 */
	private transformSDKMessage(_message: SDKMessage) {
		// TODO: Transform SDK message types to match existing output format
		// This would map:
		// - SDKAssistantMessage -> existing assistant message format
		// - Tool calls -> existing tool call format
		// - etc.

		return null;
	}

	/**
	 * Get current workflow state
	 *
	 * Compatible with LangGraph implementation's getState method
	 */
	async getState(_workflowId: string, _userId?: string) {
		return {
			values: {
				workflowJSON: this.workflowJSON,
				workflowContext: this.workflowContext,
				messages: [],
			},
		};
	}
}
