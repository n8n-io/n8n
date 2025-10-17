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
 */

import {
	query,
	tool,
	createSdkMcpServer,
	type AgentDefinition,
	type SDKMessage,
	type SDKAssistantMessage,
	type SDKUserMessage,
	type SDKResultMessage,
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
import { createConnection, inferConnectionType } from './tools/utils/connection.utils';
import { getLatestVersion } from './tools/utils/node-creation.utils';
import { fixExpressionPrefixes } from './tools/utils/parameter-update.utils';
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
/**
 * Type guards for SDK messages
 */
function isSDKAssistantMessage(message: SDKMessage): message is SDKAssistantMessage {
	return message.type === 'assistant' && 'message' in message;
}

function isSDKUserMessage(message: SDKMessage): message is SDKUserMessage {
	return message.type === 'user' && 'message' in message;
}

function isSDKResultMessage(message: SDKMessage): message is SDKResultMessage {
	return message.type === 'result';
}

/**
 * Usage tracking for a single step
 */
interface StepUsage {
	messageId: string;
	timestamp: string;
	inputTokens: number;
	outputTokens: number;
	cacheReadTokens: number;
	cacheCreationTokens: number;
	durationMs?: number;
}

/**
 * Cumulative usage statistics
 */
interface CumulativeUsage {
	totalInputTokens: number;
	totalOutputTokens: number;
	totalCacheReadTokens: number;
	totalCacheCreationTokens: number;
	totalDurationMs: number;
	stepCount: number;
	steps: StepUsage[];
}

export class WorkflowBuilderAgentClaude {
	// State lives in instance fields
	private workflowJSON: SimpleWorkflow;
	private workflowContext: ChatPayload['workflowContext'] | null;
	private parsedNodeTypes: INodeTypeDescription[];
	private logger?: Logger;
	private apiKey?: string;
	private model: string;

	// Usage tracking
	private processedMessageIds = new Set<string>();
	private usage: CumulativeUsage = {
		totalInputTokens: 0,
		totalOutputTokens: 0,
		totalCacheReadTokens: 0,
		totalCacheCreationTokens: 0,
		totalDurationMs: 0,
		stepCount: 0,
		steps: [],
	};
	private stepStartTime?: number;

	constructor(config: WorkflowBuilderAgentClaudeConfig) {
		this.parsedNodeTypes = config.parsedNodeTypes;
		this.logger = config.logger;
		this.apiKey = config.apiKey;
		// this.model = config.model ?? 'haiku';
		this.model = 'sonnet';

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
	async *chat(payload: ChatPayload, _userId?: string, _abortSignal?: AbortSignal) {
		// Initialize state from payload
		if (payload.workflowContext?.currentWorkflow) {
			this.workflowJSON = payload.workflowContext.currentWorkflow as SimpleWorkflow;
		}
		this.workflowContext = payload.workflowContext ?? null;

		this.logger?.info('[SDK] Building workflow', {
			userMessage: payload.message.substring(0, 100),
			currentNodeCount: this.workflowJSON.nodes.length,
			apiKeyConfigured: !!this.apiKey,
		});

		// Start timing the entire workflow building process
		this.stepStartTime = Date.now();

		try {
			// Create workflow tools
			this.logger?.info('[SDK] Creating workflow tools...');
			const tools = this.createWorkflowTools();
			this.logger?.info('[SDK] Created tools', { toolCount: tools.length });

			// Create MCP server with workflow tools
			this.logger?.info('[SDK] Creating MCP server...');
			const workflowMcp = createSdkMcpServer({
				name: 'workflow-builder',
				version: '1.0.0',
				tools,
			});
			this.logger?.info('[SDK] MCP server created');

			// Tool names for allowed tools (with MCP prefix)
			const workflowToolNames = [
				'mcp__workflow-builder__search_node_types',
				'mcp__workflow-builder__get_node_details',
				'mcp__workflow-builder__add_workflow_node',
				'mcp__workflow-builder__connect_nodes',
				'mcp__workflow-builder__set_node_parameters',
				'mcp__workflow-builder__get_workflow_context',
			];
			this.logger?.info('[SDK] Starting query with config', {
				model: this.model,
				toolCount: workflowToolNames.length,
				subagentCount: Object.keys(this.defineSubagents()).length,
			});

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

			this.logger?.info('[SDK] Query started, waiting for messages...');

			// Stream responses and yield workflow updates
			let messageCount = 0;
			let previousNodeCount = this.workflowJSON.nodes.length;
			let previousConnectionCount = Object.keys(this.workflowJSON.connections).length;

			for await (const message of result) {
				messageCount++;

				console.log('\n=== SDK MESSAGE #' + messageCount + ' ===');
				console.log('Type:', message.type);

				// Log message details based on type
				if (isSDKAssistantMessage(message)) {
					console.log(
						'Assistant message content:',
						JSON.stringify(message.message.content, null, 2),
					);
				} else if (isSDKUserMessage(message)) {
					// Log tool results (truncated to 1000 chars)
					const content = message.message.content;
					if (Array.isArray(content)) {
						for (const block of content) {
							if ('type' in block && block.type === 'tool_result' && 'content' in block) {
								let resultText = '';
								if (Array.isArray(block.content)) {
									resultText = block.content
										.map((c) => {
											if (
												typeof c === 'object' &&
												c !== null &&
												'type' in c &&
												c.type === 'text' &&
												'text' in c
											) {
												return c.text;
											}
											return '';
										})
										.filter(Boolean)
										.join('\n');
								} else if (typeof block.content === 'string') {
									resultText = block.content;
								}
								const truncated =
									resultText.length > 1000
										? resultText.substring(0, 1000) + '...[truncated]'
										: resultText;
								console.log(
									`Tool result for ${'tool_use_id' in block ? block.tool_use_id : 'unknown'}:`,
									truncated,
								);
							}
						}
					}
				} else if (isSDKResultMessage(message)) {
					console.log('Result - completed in', message.duration_ms, 'ms');
				}

				console.log('Current workflow state - Nodes:', this.workflowJSON.nodes.length);
				console.log(
					'Current workflow state - Connections:',
					Object.keys(this.workflowJSON.connections).length,
				);
				console.log('=== END MESSAGE #' + messageCount + ' ===\n');

				// Track usage from assistant messages (avoid duplicates by message ID)
				this.trackUsage(message);

				// Transform SDK messages to match existing output format
				const output = this.transformSDKMessage(message);
				if (output) {
					console.log('Yielding transformed output with', output.messages.length, 'messages');
					yield output;
				}

				// Emit workflow-updated when:
				// 1. Subagent completes (Task tool returns) - ALWAYS emit (parameters may change without count change)
				// 2. Main agent responds without tools - only if counts changed
				//
				// Messages FROM subagent tools have parent_tool_use_id set to the Task's ID
				// The Task tool's own result has parent_tool_use_id === null
				const isSubagentComplete =
					isSDKUserMessage(message) &&
					message.parent_tool_use_id === null &&
					// @ts-ignore
					Array.isArray(message.message.content) &&
					// @ts-ignore
					message.message.content.some((c) => 'type' in c && c.type === 'tool_result');

				const isAgentResponseWithoutTools =
					isSDKAssistantMessage(message) &&
					Array.isArray(message.message.content) &&
					// @ts-ignore
					message.message.content.some((c) => 'type' in c && c.type === 'text') &&
					// @ts-ignore
					!message.message.content.some((c) => 'type' in c && c.type === 'tool_use');

				const currentNodeCount = this.workflowJSON.nodes.length;
				const currentConnectionCount = Object.keys(this.workflowJSON.connections).length;

				// Subagent completed - always emit (builder changes structure, configurator changes parameters)
				if (isSubagentComplete) {
					console.log('⚡ Subagent completed - emitting workflow-updated event');
					console.log(
						`  Nodes: ${previousNodeCount} → ${currentNodeCount}, Connections: ${previousConnectionCount} → ${currentConnectionCount}`,
					);

					yield {
						messages: [
							{
								role: 'assistant',
								type: 'workflow-updated',
								codeSnippet: JSON.stringify(this.workflowJSON, null, 2),
							},
						],
					};

					previousNodeCount = currentNodeCount;
					previousConnectionCount = currentConnectionCount;
				}
				// Main agent responded - only emit if structure changed
				else if (isAgentResponseWithoutTools) {
					if (
						currentNodeCount !== previousNodeCount ||
						currentConnectionCount !== previousConnectionCount
					) {
						console.log('⚡ Main agent response with structure change - emitting workflow-updated');
						console.log(
							`  Nodes: ${previousNodeCount} → ${currentNodeCount}, Connections: ${previousConnectionCount} → ${currentConnectionCount}`,
						);

						yield {
							messages: [
								{
									role: 'assistant',
									type: 'workflow-updated',
									codeSnippet: JSON.stringify(this.workflowJSON, null, 2),
								},
							],
						};

						previousNodeCount = currentNodeCount;
						previousConnectionCount = currentConnectionCount;
					}
				}
			}

			this.logger?.info('[SDK] Workflow building completed');

			// Log final usage statistics
			console.log('\n========== USAGE SUMMARY ==========');
			console.log('Total Steps:', this.usage.stepCount);
			console.log('Total Input Tokens:', this.usage.totalInputTokens);
			console.log('Total Output Tokens:', this.usage.totalOutputTokens);
			console.log('Total Cache Read Tokens:', this.usage.totalCacheReadTokens);
			console.log('Total Cache Creation Tokens:', this.usage.totalCacheCreationTokens);
			console.log('Total Duration:', this.usage.totalDurationMs, 'ms');
			console.log('===================================\n');

			this.logger?.info('[SDK] Usage summary', {
				steps: this.usage.stepCount,
				inputTokens: this.usage.totalInputTokens,
				outputTokens: this.usage.totalOutputTokens,
				cacheReadTokens: this.usage.totalCacheReadTokens,
				cacheCreationTokens: this.usage.totalCacheCreationTokens,
				durationMs: this.usage.totalDurationMs,
			});
		} catch (error) {
			this.logger?.error('[SDK] Error building workflow', {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			});
			throw error;
		}
	}

	/**
	 * Track usage from messages to avoid double-counting
	 * Messages with same ID have identical usage - only count once
	 */
	private trackUsage(message: SDKMessage) {
		// Check result message for final cumulative usage
		if (isSDKResultMessage(message)) {
			if (message.usage) {
				console.log('\n📊 Final SDK Usage from Result Message:');
				console.log('  Total Input:', message.usage.input_tokens);
				console.log('  Total Output:', message.usage.output_tokens);
				console.log('  Cache Read:', message.usage.cache_read_input_tokens);
				console.log('  Cache Creation:', message.usage.cache_creation_input_tokens);
				console.log('  Duration:', message.duration_ms, 'ms');
				console.log('  Total Cost: $' + message.total_cost_usd.toFixed(4));
			}
			return;
		}

		// Only track assistant messages with usage
		if (!isSDKAssistantMessage(message)) {
			return;
		}

		const msgUsage = message.message.usage;
		const msgUuid = message.uuid;

		if (!msgUsage || !msgUuid) {
			return;
		}

		// Skip if already processed this message ID
		if (this.processedMessageIds.has(msgUuid)) {
			return;
		}

		// Mark as processed
		this.processedMessageIds.add(msgUuid);

		// Calculate step duration
		const stepDuration = this.stepStartTime ? Date.now() - this.stepStartTime : 0;

		// Extract usage data safely
		const stepUsage: StepUsage = {
			messageId: msgUuid,
			timestamp: new Date().toISOString(),
			inputTokens: msgUsage.input_tokens ?? 0,
			outputTokens: msgUsage.output_tokens ?? 0,
			cacheReadTokens: msgUsage.cache_read_input_tokens ?? 0,
			cacheCreationTokens: msgUsage.cache_creation_input_tokens ?? 0,
			durationMs: stepDuration,
		};

		// Update cumulative totals
		this.usage.totalInputTokens += stepUsage.inputTokens;
		this.usage.totalOutputTokens += stepUsage.outputTokens;
		this.usage.totalCacheReadTokens += stepUsage.cacheReadTokens;
		this.usage.totalCacheCreationTokens += stepUsage.cacheCreationTokens;
		this.usage.totalDurationMs += stepUsage.durationMs ?? 0;
		this.usage.stepCount++;
		this.usage.steps.push(stepUsage);

		// Log step usage
		console.log(`\n📊 Step #${this.usage.stepCount} Usage (ID: ${msgUuid.substring(0, 8)}...):`);
		console.log(`  Input: ${stepUsage.inputTokens} | Output: ${stepUsage.outputTokens}`);
		console.log(
			`  Cache Read: ${stepUsage.cacheReadTokens} | Cache Creation: ${stepUsage.cacheCreationTokens}`,
		);
		console.log(`  Duration: ${stepUsage.durationMs}ms`);

		// Reset step timer for next step
		this.stepStartTime = Date.now();
	}

	/**
	 * Get current usage statistics
	 */
	getUsageStats() {
		return {
			...this.usage,
			totalTokens: this.usage.totalInputTokens + this.usage.totalOutputTokens,
		};
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
				tools: [
					'mcp__workflow-builder__search_node_types',
					'mcp__workflow-builder__get_node_details',
					'mcp__workflow-builder__get_workflow_context',
				],
				model: 'sonnet',
			},

			builder: {
				description:
					'MUST USE after discovery to create workflow structure. Use when you have identified nodes and need to add them to the workflow and connect them.',
				prompt: SDK_BUILDER_PROMPT,
				tools: [
					'mcp__workflow-builder__add_workflow_node',
					'mcp__workflow-builder__connect_nodes',
					'mcp__workflow-builder__get_workflow_context',
				],
				model: 'sonnet',
			},

			configurator: {
				description:
					'MUST USE after building to configure node parameters. Use when workflow structure exists but nodes need parameter configuration.',
				prompt: SDK_CONFIGURATOR_PROMPT,
				tools: [
					'mcp__workflow-builder__set_node_parameters',
					'mcp__workflow-builder__get_workflow_context',
				],
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
					const queryLower = args.query.toLowerCase();

					const results = this.parsedNodeTypes
						.filter((node) => {
							const displayName = node.displayName?.toLowerCase() ?? '';
							const description = node.description?.toLowerCase() ?? '';
							return displayName.includes(queryLower) || description.includes(queryLower);
						})
						.slice(0, 10);

					this.logger?.debug('[SDK Tool] Search node types', {
						query: args.query,
						resultsCount: results.length,
					});

					const output = JSON.stringify({
						results: results.map((n) => ({
							name: n.name,
							displayName: n.displayName,
							description: n.description,
						})),
					});

					console.log(
						'[Tool Output] search_node_types:',
						output.length > 1000 ? output.substring(0, 1000) + '...[truncated]' : output,
					);

					return {
						content: [
							{
								type: 'text' as const,
								text: output,
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
						console.log(
							'[Tool Output] get_node_details: ERROR - Node type not found:',
							args.nodeType,
						);
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

					const latestVersion = getLatestVersion(node);

					const output = JSON.stringify({
						node: {
							name: node.name,
							displayName: node.displayName,
							description: node.description,
							version: latestVersion,
							defaultVersion: node.defaultVersion,
							properties: node.properties,
							inputs: node.inputs,
							outputs: node.outputs,
						},
					});

					console.log(
						'[Tool Output] get_node_details:',
						output.length > 1000 ? output.substring(0, 1000) + '...[truncated]' : output,
					);

					return {
						content: [
							{
								type: 'text' as const,
								text: output,
							},
						],
					};
				},
			),

			// Add workflow node
			tool(
				'add_workflow_node',
				'Add a node to the workflow. Position will be auto-calculated by the frontend.',
				{
					nodeType: z.string().describe('Node type name'),
					name: z.string().describe('Human-readable node name'),
					connectionParametersReasoning: z
						.string()
						.describe(
							'Explain your reasoning about connection parameters. Does this node have dynamic inputs/outputs? Examples: "Vector Store needs mode:insert for document input" or "HTTP Request has static connections, using {}"',
						),
					connectionParameters: z
						.record(z.any())
						.describe(
							'Parameters that affect connections (e.g., {mode: "insert"} for Vector Store). Use {} if no connection parameters needed.',
						),
				},
				async (args) => {
					// Find node type to get latest version
					const nodeType = this.parsedNodeTypes.find((nt) => nt.name === args.nodeType);

					if (!nodeType) {
						console.log(
							'[Tool Output] add_workflow_node: ERROR - Node type not found:',
							args.nodeType,
						);
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

					// Mutate instance state
					const nodeId = `node-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
					const latestVersion = getLatestVersion(nodeType);

					// Position will be auto-calculated by frontend
					this.workflowJSON.nodes.push({
						id: nodeId,
						name: args.name,
						type: args.nodeType,
						typeVersion: latestVersion,
						position: [0, 0],
						parameters: args.connectionParameters || {},
					});

					this.logger?.debug('[SDK Tool] Added node', {
						nodeId,
						nodeType: args.nodeType,
						name: args.name,
						typeVersion: latestVersion,
						connectionParams: args.connectionParameters,
						reasoning: args.connectionParametersReasoning.substring(0, 100),
					});

					const output = JSON.stringify({
						success: true,
						nodeId,
						nodeName: args.name,
						nodeCount: this.workflowJSON.nodes.length,
						connectionParametersApplied: args.connectionParameters,
					});

					console.log(
						'[Tool Output] add_workflow_node:',
						output.length > 1000 ? output.substring(0, 1000) + '...[truncated]' : output,
					);

					return {
						content: [
							{
								type: 'text' as const,
								text: output,
							},
						],
					};
				},
			),

			// Connect nodes
			tool(
				'connect_nodes',
				'Connect two nodes in the workflow. Connection type is auto-detected based on node types.',
				{
					sourceNodeId: z.string().describe('Source node ID (provides output/capability)'),
					targetNodeId: z.string().describe('Target node ID (receives input/uses capability)'),
					sourceOutputIndex: z.number().optional().describe('Source output index (default: 0)'),
					targetInputIndex: z.number().optional().describe('Target input index (default: 0)'),
				},
				async (args) => {
					// Find nodes by ID
					const sourceNode = this.workflowJSON.nodes.find((n) => n.id === args.sourceNodeId);
					const targetNode = this.workflowJSON.nodes.find((n) => n.id === args.targetNodeId);

					if (!sourceNode || !targetNode) {
						const missingId = !sourceNode ? args.sourceNodeId : args.targetNodeId;
						console.log('[Tool Output] connect_nodes: ERROR - Node not found:', missingId);
						return {
							content: [
								{
									type: 'text' as const,
									text: JSON.stringify({
										error: 'Node not found',
										missingNodeId: missingId,
									}),
								},
							],
							isError: true,
						};
					}

					// Get node type descriptions for inference
					const sourceNodeType = this.parsedNodeTypes.find((nt) => nt.name === sourceNode.type);
					const targetNodeType = this.parsedNodeTypes.find((nt) => nt.name === targetNode.type);

					if (!sourceNodeType || !targetNodeType) {
						console.log('[Tool Output] connect_nodes: ERROR - Node type not found');
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

					// Infer connection type automatically
					const inferResult = inferConnectionType(
						sourceNode,
						targetNode,
						sourceNodeType,
						targetNodeType,
					);

					if (inferResult.error) {
						console.log(
							'[Tool Output] connect_nodes: ERROR - Connection inference failed:',
							inferResult.error,
						);
						return {
							content: [
								{
									type: 'text' as const,
									text: JSON.stringify({
										error: inferResult.error,
										possibleTypes: inferResult.possibleTypes,
									}),
								},
							],
							isError: true,
						};
					}

					const connectionType = inferResult.connectionType!;
					let actualSourceNode = sourceNode;
					let actualTargetNode = targetNode;

					// Swap nodes if required (for ai_* connections when specified backwards)
					if (inferResult.requiresSwap) {
						console.log('[Tool] Auto-swapping nodes for AI connection');
						actualSourceNode = targetNode;
						actualTargetNode = sourceNode;
					}

					// Create connection using node NAMES (not IDs)
					this.workflowJSON.connections = createConnection(
						this.workflowJSON.connections,
						actualSourceNode.name,
						actualTargetNode.name,
						connectionType,
						args.sourceOutputIndex ?? 0,
						args.targetInputIndex ?? 0,
					);

					this.logger?.debug('[SDK Tool] Connected nodes', {
						source: actualSourceNode.name,
						target: actualTargetNode.name,
						type: connectionType,
						swapped: inferResult.requiresSwap,
					});

					const output = JSON.stringify({
						success: true,
						sourceNode: actualSourceNode.name,
						targetNode: actualTargetNode.name,
						connectionType,
						swapped: inferResult.requiresSwap ?? false,
					});

					console.log(
						'[Tool Output] connect_nodes:',
						output.length > 1000 ? output.substring(0, 1000) + '...[truncated]' : output,
					);

					return {
						content: [
							{
								type: 'text' as const,
								text: output,
							},
						],
					};
				},
			),

			// Set node parameters
			tool(
				'set_node_parameters',
				'Configure parameters for a node. Pass the actual parameter object to set.',
				{
					nodeId: z.string().describe('Node ID to configure'),
					parameters: z.record(z.any()).describe('Parameters object to set on the node'),
				},
				async (args) => {
					// Find the node
					const node = this.workflowJSON.nodes.find((n) => n.id === args.nodeId);

					if (!node) {
						console.log('[Tool Output] set_node_parameters: ERROR - Node not found:', args.nodeId);
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

					// Directly apply parameters (subagent has already reasoned about them)
					node.parameters = {
						...node.parameters,
						...fixExpressionPrefixes(args.parameters),
					};

					this.logger?.debug('[SDK Tool] Set node parameters', {
						nodeId: args.nodeId,
						nodeName: node.name,
						parameterKeys: Object.keys(args.parameters),
					});

					const output = JSON.stringify({
						success: true,
						nodeId: args.nodeId,
						nodeName: node.name,
						updatedParameters: node.parameters,
					});

					console.log(
						'[Tool Output] set_node_parameters:',
						output.length > 1000 ? output.substring(0, 1000) + '...[truncated]' : output,
					);

					return {
						content: [
							{
								type: 'text' as const,
								text: output,
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
					const output = JSON.stringify({
						workflowJSON: this.workflowJSON,
						executionData: this.workflowContext?.executionData ?? {},
						executionSchema: this.workflowContext?.executionSchema ?? [],
						nodeCount: this.workflowJSON.nodes.length,
						connectionCount: Object.keys(this.workflowJSON.connections).length,
					});

					console.log(
						'[Tool Output] get_workflow_context:',
						output.length > 1000 ? output.substring(0, 1000) + '...[truncated]' : output,
					);

					return {
						content: [
							{
								type: 'text' as const,
								text: output,
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
	private transformSDKMessage(message: SDKMessage) {
		const messages: any[] = [];

		// Handle assistant messages
		if (isSDKAssistantMessage(message)) {
			const messageContent = message.message.content;

			// Handle array content
			if (Array.isArray(messageContent)) {
				for (const block of messageContent) {
					if ('type' in block && block.type === 'text' && 'text' in block && block.text) {
						messages.push({
							role: 'assistant',
							type: 'message',
							text: block.text,
						});
					} else if (
						'type' in block &&
						block.type === 'tool_use' &&
						'id' in block &&
						'name' in block
					) {
						// Emit tool call
						messages.push({
							id: block.id,
							toolCallId: block.id,
							role: 'assistant',
							type: 'tool',
							toolName: block.name,
							displayTitle: this.getToolDisplayTitle(block.name),
							status: 'executing',
							updates: [
								{
									type: 'input',
									data: ('input' in block ? block.input : {}) || {},
								},
							],
						});
					}
				}
			}
			// Handle string content case
			// Note: TypeScript can't narrow SDK's union type properly after Array.isArray check
			// But we know it's safe because content is either string or array
			else if (typeof messageContent === 'string') {
				const trimmed = messageContent.trim();
				if (trimmed) {
					messages.push({
						role: 'assistant',
						type: 'message',
						text: messageContent,
					});
				}
			}
		}

		// Handle result messages (final response)
		if (isSDKResultMessage(message)) {
			// Only success subtype has result field
			if (message.subtype === 'success' && 'result' in message) {
				const successMsg = message;
				if (successMsg.result && typeof successMsg.result === 'string') {
					messages.push({
						role: 'assistant',
						type: 'message',
						text: successMsg.result,
					});
				}
			}
		}

		return messages.length > 0 ? { messages } : null;
	}

	/**
	 * Get display title for a tool name
	 */
	private getToolDisplayTitle(toolName: string): string {
		const displayTitles: Record<string, string> = {
			'mcp__workflow-builder__search_node_types': 'Searching for nodes',
			'mcp__workflow-builder__get_node_details': 'Getting node details',
			'mcp__workflow-builder__add_workflow_node': 'Adding node',
			'mcp__workflow-builder__connect_nodes': 'Connecting nodes',
			'mcp__workflow-builder__set_node_parameters': 'Configuring node',
			'mcp__workflow-builder__get_workflow_context': 'Getting workflow context',
		};

		return displayTitles[toolName] || toolName;
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
