import { DynamicStructuredTool } from '@langchain/core/tools';
import {
	NodeConnectionTypes,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';
import { z } from 'zod';

import { logWrapper } from '@utils/logWrapper';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

/**
 * A2A JSON-RPC response types
 */
interface JsonRpcResponse {
	jsonrpc: '2.0';
	id: string | number;
	result?: {
		type: 'task';
		id: string;
		status: {
			state: string;
			message?: {
				role: string;
				parts: Array<{ type: string; text?: string }>;
			};
		};
		history?: Array<{
			role: string;
			parts: Array<{ type: string; text?: string }>;
		}>;
	};
	error?: {
		code: number;
		message: string;
	};
}

/**
 * Helper function to extract text from A2A response
 */
function extractResponseText(result: JsonRpcResponse['result']): string {
	if (!result) return 'No response';

	// Try to get from status message first
	if (result.status.message?.parts) {
		const textParts = result.status.message.parts
			.filter((p) => p.type === 'text' && p.text)
			.map((p) => p.text);
		if (textParts.length > 0) {
			return textParts.join('\n');
		}
	}

	// Try to get from history (last agent message)
	if (result.history) {
		const agentMessages = result.history.filter((m) => m.role === 'agent');
		if (agentMessages.length > 0) {
			const lastMessage = agentMessages[agentMessages.length - 1];
			const textParts = lastMessage.parts
				.filter((p) => p.type === 'text' && p.text)
				.map((p) => p.text);
			if (textParts.length > 0) {
				return textParts.join('\n');
			}
		}
	}

	return 'No response text found';
}

/**
 * Helper function to sleep for polling
 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * A2A Client Tool
 *
 * This tool allows an AI Agent to communicate with a remote A2A-compatible agent.
 * It sends a message via JSON-RPC `message/send` and polls `tasks/get` until completion.
 */
export class ToolA2A implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'A2A Client Tool',
		name: 'toolA2A',
		icon: 'fa:robot',
		iconColor: 'purple',
		group: ['transform'],
		version: 1,
		description: 'Call a remote A2A agent and wait for the response',
		defaults: {
			name: 'A2A Agent',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Tools'],
				Tools: ['Other Tools'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toola2a/',
					},
				],
			},
		},

		inputs: [],
		outputs: [{ type: NodeConnectionTypes.AiTool, displayName: 'Tool' }],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiAgent]),
			{
				displayName: 'Agent URL',
				name: 'agentUrl',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'https://example.com/webhook/abc123/a2a',
				description: 'The URL of the remote A2A agent endpoint',
			},
			{
				displayName: 'Tool Description',
				name: 'toolDescription',
				type: 'string',
				default: 'Call a remote AI agent to perform a task',
				description:
					'Describe what this remote agent can do. This helps the AI decide when to use this tool.',
				typeOptions: {
					rows: 3,
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Poll Interval (ms)',
						name: 'pollInterval',
						type: 'number',
						default: 1000,
						description: 'How often to check if the task is complete',
					},
					{
						displayName: 'Max Poll Attempts',
						name: 'maxPollAttempts',
						type: 'number',
						default: 300,
						description:
							'Maximum number of times to poll before timing out (default: 5 minutes at 1s interval)',
					},
					{
						displayName: 'Timeout (ms)',
						name: 'timeout',
						type: 'number',
						default: 300000,
						description: 'Maximum time to wait for a response (default: 5 minutes)',
					},
				],
			},
		],
	};

	/**
	 * Supply the A2A client tool to the AI Agent
	 */
	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const agentUrl = this.getNodeParameter('agentUrl', itemIndex) as string;
		const toolDescription = this.getNodeParameter('toolDescription', itemIndex) as string;
		const options = this.getNodeParameter('options', itemIndex, {}) as {
			pollInterval?: number;
			maxPollAttempts?: number;
			timeout?: number;
		};

		// Validate URL
		if (!agentUrl || agentUrl.trim() === '') {
			throw new Error(
				'Agent URL is required. Please configure the A2A Client Tool with a valid agent URL.',
			);
		}

		// Validate URL format
		try {
			new URL(agentUrl);
		} catch {
			throw new Error(
				`Invalid Agent URL: "${agentUrl}". Please provide a valid URL (e.g., https://example.com/webhook/abc/a2a)`,
			);
		}

		const pollInterval = options.pollInterval ?? 1000;
		const maxPollAttempts = options.maxPollAttempts ?? 300;
		const timeout = options.timeout ?? 300000;

		const ctx = this;
		const toolName = this.getNode().name.replace(/\s/g, '_');

		ctx.logger.info('A2A Client Tool: Configured', {
			agentUrl,
			toolName,
			toolDescription: toolDescription.substring(0, 50),
			pollInterval,
			maxPollAttempts,
			timeout,
		});

		const tool = new DynamicStructuredTool({
			name: toolName,
			description: toolDescription,
			schema: z.object({
				message: z.string().describe('The message to send to the remote A2A agent'),
			}),
			func: async ({ message }: { message: string }): Promise<string> => {
				ctx.logger.info('A2A Client: Tool called', { messageLength: message?.length });

				if (!message) {
					return 'Error: No message provided';
				}

				const startTime = Date.now();

				try {
					// Step 1: Send message/send to start the task
					ctx.logger.info('A2A Client: Starting task', { agentUrl });

					const sendResponse = (await ctx.helpers.httpRequest({
						method: 'POST',
						url: agentUrl,
						headers: {
							'Content-Type': 'application/json',
						},
						body: {
							jsonrpc: '2.0',
							id: Date.now().toString(),
							method: 'message/send',
							params: {
								message: {
									role: 'user',
									parts: [{ type: 'text', text: message }],
								},
							},
						},
						json: true,
					})) as JsonRpcResponse;

					if (sendResponse.error) {
						throw new Error(`A2A Error: ${sendResponse.error.message}`);
					}

					if (!sendResponse.result) {
						throw new Error('A2A Error: No result in response');
					}

					const taskId = sendResponse.result.id;
					let status = sendResponse.result.status.state;

					ctx.logger.info('A2A Client: Task started', { taskId, status });

					// If already completed, return immediately
					if (status === 'completed') {
						ctx.logger.info('A2A Client: Task completed immediately', { taskId });
						return extractResponseText(sendResponse.result);
					}

					// Step 2: Poll tasks/get until completed or failed
					let attempts = 0;

					while (status === 'working' || status === 'submitted') {
						// Check timeout
						if (Date.now() - startTime > timeout) {
							throw new Error(`A2A Error: Timeout after ${timeout}ms`);
						}

						// Check max attempts
						if (attempts >= maxPollAttempts) {
							throw new Error(`A2A Error: Max poll attempts (${maxPollAttempts}) exceeded`);
						}

						// Wait before polling
						await sleep(pollInterval);
						attempts++;

						ctx.logger.debug('A2A Client: Polling task', { taskId, attempt: attempts });

						// Poll for status
						const pollResponse = (await ctx.helpers.httpRequest({
							method: 'POST',
							url: agentUrl,
							headers: {
								'Content-Type': 'application/json',
							},
							body: {
								jsonrpc: '2.0',
								id: Date.now().toString(),
								method: 'tasks/get',
								params: {
									taskId,
								},
							},
							json: true,
						})) as JsonRpcResponse;

						if (pollResponse.error) {
							throw new Error(`A2A Poll Error: ${pollResponse.error.message}`);
						}

						if (!pollResponse.result) {
							throw new Error('A2A Poll Error: No result in response');
						}

						status = pollResponse.result.status.state;

						if (status === 'completed') {
							ctx.logger.info('A2A Client: Task completed', { taskId, attempts });
							return extractResponseText(pollResponse.result);
						}

						if (status === 'failed' || status === 'canceled') {
							throw new Error(`A2A Error: Task ${status}`);
						}
					}

					throw new Error(`A2A Error: Unexpected status: ${status}`);
				} catch (error) {
					ctx.logger.error('A2A Client: Error', {
						error: error instanceof Error ? error.message : 'Unknown error',
					});
					throw error;
				}
			},
		});

		return {
			response: logWrapper(tool, this),
		};
	}

	/**
	 * Execute method - allows the tool to be run directly (not just as a sub-node)
	 * This is required to prevent n8n from assigning a RoutingNode-based execute.
	 */
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const agentUrl = this.getNodeParameter('agentUrl', 0) as string;
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		// Validate URL
		if (!agentUrl || agentUrl.trim() === '') {
			throw new Error('Agent URL is required');
		}

		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			const message =
				typeof item.json.message === 'string'
					? item.json.message
					: typeof item.json.query === 'string'
						? item.json.query
						: typeof item.json.input === 'string'
							? item.json.input
							: JSON.stringify(item.json);

			// Make the A2A request
			const sendResponse = (await this.helpers.httpRequest({
				method: 'POST',
				url: agentUrl,
				headers: { 'Content-Type': 'application/json' },
				body: {
					jsonrpc: '2.0',
					id: Date.now().toString(),
					method: 'message/send',
					params: {
						message: {
							role: 'user',
							parts: [{ type: 'text', text: message }],
						},
					},
				},
				json: true,
			})) as JsonRpcResponse;

			if (sendResponse.error) {
				throw new Error(`A2A Error: ${sendResponse.error.message}`);
			}

			const taskId = sendResponse.result?.id;
			let status = sendResponse.result?.status.state;
			let result = sendResponse.result;

			// Poll if not completed
			const pollInterval = 1000;
			const maxAttempts = 300;
			let attempts = 0;

			while (status === 'working' || status === 'submitted') {
				if (attempts >= maxAttempts) {
					throw new Error('A2A Error: Polling timeout');
				}
				await new Promise((resolve) => setTimeout(resolve, pollInterval));
				attempts++;

				const pollResponse = (await this.helpers.httpRequest({
					method: 'POST',
					url: agentUrl,
					headers: { 'Content-Type': 'application/json' },
					body: {
						jsonrpc: '2.0',
						id: Date.now().toString(),
						method: 'tasks/get',
						params: { taskId },
					},
					json: true,
				})) as JsonRpcResponse;

				if (pollResponse.error) {
					throw new Error(`A2A Poll Error: ${pollResponse.error.message}`);
				}

				result = pollResponse.result;
				status = result?.status.state;
			}

			if (status === 'failed' || status === 'canceled') {
				throw new Error(`A2A Error: Task ${status}`);
			}

			returnData.push({
				json: {
					response: extractResponseText(result),
					taskId,
					status,
				},
				pairedItem: { item: i },
			});
		}

		return [returnData];
	}
}
