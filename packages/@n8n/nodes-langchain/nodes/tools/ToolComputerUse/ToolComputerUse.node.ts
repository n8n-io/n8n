import { DynamicStructuredTool } from '@langchain/core/tools';
import { getConnectionHintNoticeField, logWrapper } from '@n8n/ai-utilities';
import type { JSONSchema7 } from 'json-schema';
import pick from 'lodash/pick';
import { StructuredToolkit } from 'n8n-core';
import {
	type IDataObject,
	type IExecuteFunctions,
	type INode,
	type INodeExecutionData,
	type INodePropertyOptions,
	type ILoadOptionsFunctions,
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
	NodeOperationError,
} from 'n8n-workflow';
import { z } from 'zod';

import { convertJsonSchemaToZod } from '@utils/schemaParsing';

interface GatewayTool {
	name: string;
	description?: string;
	inputSchema: JSONSchema7;
	annotations?: Record<string, unknown>;
}

interface GatewayToolsResponse {
	tools: GatewayTool[];
	hostIdentifier: string | null;
	directory: string | null;
	toolCategories: Array<{ name: string; enabled: boolean }>;
}

interface GatewayToolResult {
	content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
	structuredContent?: Record<string, unknown>;
	isError?: boolean;
}

type ToolIncludeMode = 'all' | 'selected' | 'except';

function getSelectedTools(
	tools: GatewayTool[],
	mode: ToolIncludeMode,
	includeTools: string[],
	excludeTools: string[],
): GatewayTool[] {
	switch (mode) {
		case 'selected': {
			if (!includeTools.length) return tools;
			const include = new Set(includeTools);
			return tools.filter((t) => include.has(t.name));
		}
		case 'except': {
			const except = new Set(excludeTools);
			return tools.filter((t) => !except.has(t.name));
		}
		case 'all':
		default:
			return tools;
	}
}

const MAX_TOOL_NAME_LENGTH = 64;

function buildToolName(serverName: string, toolName: string): string {
	const sanitized = serverName.replace(/[^a-zA-Z0-9]/g, '_');
	const full = `${sanitized}_${toolName}`;
	if (full.length <= MAX_TOOL_NAME_LENGTH) return full;
	const maxPrefix = MAX_TOOL_NAME_LENGTH - toolName.length - 1;
	return maxPrefix > 0 ? `${sanitized.slice(0, maxPrefix)}_${toolName}` : toolName;
}

async function parseErrorResponse(response: Response): Promise<string> {
	const text = await response.text().catch(() => '');
	try {
		const parsed = JSON.parse(text) as { message?: string };
		return parsed.message ?? text;
	} catch {
		return text || `Gateway returned ${response.status}`;
	}
}

async function fetchGatewayTools(
	instanceUrl: string,
	apiKey: string,
	timeout: number,
	node: INode,
): Promise<GatewayToolsResponse> {
	const url = `${instanceUrl.replace(/\/$/, '')}/rest/instance-ai/gateway/tools`;
	const response = await fetch(url, {
		method: 'GET',
		headers: {
			'X-Gateway-Key': apiKey,
			'Content-Type': 'application/json',
		},
		signal: AbortSignal.timeout(timeout),
	});

	if (!response.ok) {
		throw new NodeOperationError(node, await parseErrorResponse(response));
	}

	const body = (await response.json()) as { data: GatewayToolsResponse };
	return body.data;
}

async function callGatewayTool(
	instanceUrl: string,
	apiKey: string,
	toolName: string,
	toolArgs: Record<string, unknown>,
	timeout: number,
	node: INode,
): Promise<GatewayToolResult> {
	const url = `${instanceUrl.replace(/\/$/, '')}/rest/instance-ai/gateway/call-tool`;
	const response = await fetch(url, {
		method: 'POST',
		headers: {
			'X-Gateway-Key': apiKey,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ name: toolName, arguments: toolArgs }),
		signal: AbortSignal.timeout(timeout),
	});

	if (!response.ok) {
		throw new NodeOperationError(node, await parseErrorResponse(response));
	}

	return (await response.json()) as GatewayToolResult;
}

function extractTextFromResult(result: GatewayToolResult): string {
	if (result.structuredContent) {
		return JSON.stringify(result.structuredContent);
	}

	return result.content
		.map((c) => {
			if (c.type === 'text' && c.text) return c.text;
			if (c.type === 'image' && c.data) return `[image: ${c.mimeType ?? 'unknown'}]`;
			return '';
		})
		.filter(Boolean)
		.join('\n');
}

export class ToolComputerUse implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Computer Use',
		name: 'toolComputerUse',
		icon: 'fa:desktop',
		group: ['output'],
		version: 1,
		description:
			'Control a connected device — browse the web, read and write files, and more. Requires the n8n CLI running on the target machine.',
		defaults: {
			name: 'Computer Use',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Tools'],
				Tools: ['Recommended Tools'],
			},
			alias: ['Browser Use', 'Device Control', 'Computer Use', 'File System'],
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolcomputeruse/',
					},
				],
			},
		},
		inputs: [],
		outputs: [{ type: NodeConnectionTypes.AiTool, displayName: 'Tools' }],
		credentials: [
			{
				name: 'deviceConnectionApi',
				required: true,
			},
		],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiAgent]),
			{
				displayName: 'Tools to Include',
				name: 'include',
				type: 'options',
				description: 'How to select the tools exposed to the AI Agent',
				default: 'all',
				options: [
					{
						name: 'All',
						value: 'all',
						description: 'Expose all tools from the connected device',
					},
					{
						name: 'Selected',
						value: 'selected',
						description: 'Only include the tools listed below',
					},
					{
						name: 'All Except',
						value: 'except',
						description: 'Exclude the tools listed below',
					},
				],
			},
			{
				displayName: 'Tools to Include',
				name: 'includeTools',
				type: 'multiOptions',
				default: [],
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getTools',
				},
				displayOptions: {
					show: {
						include: ['selected'],
					},
				},
			},
			{
				displayName: 'Tools to Exclude',
				name: 'excludeTools',
				type: 'multiOptions',
				default: [],
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getTools',
				},
				displayOptions: {
					show: {
						include: ['except'],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				placeholder: 'Add Option',
				description: 'Additional options',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'Timeout',
						name: 'timeout',
						type: 'number',
						typeOptions: { minValue: 1 },
						default: 60000,
						description: 'Time in ms to wait for tool calls to finish',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getTools(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('deviceConnectionApi');
				const instanceUrl = credentials.instanceUrl as string;
				const apiKey = credentials.gatewayApiKey as string;

				const { tools } = await fetchGatewayTools(instanceUrl, apiKey, 10_000, this.getNode());
				return tools.map((tool) => ({
					name: tool.name,
					value: tool.name,
					description: tool.description,
				}));
			},
		},
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const node = this.getNode();
		const credentials = await this.getCredentials('deviceConnectionApi');
		const instanceUrl = credentials.instanceUrl as string;
		const apiKey = credentials.gatewayApiKey as string;
		const timeout = this.getNodeParameter('options.timeout', itemIndex, 60000) as number;
		const includeMode = this.getNodeParameter('include', itemIndex) as ToolIncludeMode;
		const includeTools = this.getNodeParameter('includeTools', itemIndex, []) as string[];
		const excludeTools = this.getNodeParameter('excludeTools', itemIndex, []) as string[];

		const setError = (error: NodeOperationError): SupplyData => {
			this.addOutputData(NodeConnectionTypes.AiTool, itemIndex, error);
			throw error;
		};

		let gatewayResponse: GatewayToolsResponse;
		try {
			gatewayResponse = await fetchGatewayTools(instanceUrl, apiKey, timeout, node);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.logger.error('Computer Use: Failed to connect to device', { error: message });
			return setError(
				new NodeOperationError(node, `Failed to connect to device: ${message}`, { itemIndex }),
			);
		}

		const filteredTools = getSelectedTools(
			gatewayResponse.tools,
			includeMode,
			includeTools,
			excludeTools,
		);

		if (!filteredTools.length) {
			return setError(
				new NodeOperationError(node, 'No tools available on the connected device', {
					itemIndex,
					description: 'The device is connected but returned no tools. Check the CLI permissions.',
				}),
			);
		}

		const tools = filteredTools.map((tool) => {
			const prefixedName = buildToolName(node.name, tool.name);
			const rawSchema = convertJsonSchemaToZod(tool.inputSchema);
			const objectSchema =
				rawSchema instanceof z.ZodObject ? rawSchema : z.object({ value: rawSchema });

			const dynamicTool = new DynamicStructuredTool({
				name: prefixedName,
				description: tool.description ?? '',
				schema: objectSchema,
				func: async (args: IDataObject) => {
					const signal = this.getExecutionCancelSignal();
					if (signal?.aborted) return 'Execution was cancelled';

					try {
						const result = await callGatewayTool(
							instanceUrl,
							apiKey,
							tool.name,
							args as Record<string, unknown>,
							timeout,
							node,
						);
						if (result.isError) {
							const errorText = extractTextFromResult(result);
							const callError = new NodeOperationError(node, errorText, { itemIndex });
							void this.addOutputData(NodeConnectionTypes.AiTool, itemIndex, callError);
							this.logger.error(`Computer Use: Tool "${tool.name}" failed`, {
								error: errorText,
							});
							return errorText;
						}
						return extractTextFromResult(result);
					} catch (error) {
						if (this.getExecutionCancelSignal()?.aborted) return 'Execution was cancelled';
						const msg =
							error instanceof Error ? error.message : `Failed to execute tool "${tool.name}"`;
						const callError = new NodeOperationError(node, msg, { itemIndex });
						void this.addOutputData(NodeConnectionTypes.AiTool, itemIndex, callError);
						this.logger.error(`Computer Use: Tool "${tool.name}" failed`, { error: msg });
						return msg;
					}
				},
				metadata: { isFromToolkit: true },
			});

			return logWrapper(dynamicTool, this);
		});

		this.logger.debug(
			`Computer Use: Connected to device with ${tools.length} tools (host: ${gatewayResponse.hostIdentifier ?? 'unknown'})`,
		);

		const toolkit = new StructuredToolkit(tools);
		return { response: toolkit };
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const node = this.getNode();
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const credentials = await this.getCredentials('deviceConnectionApi');
		const instanceUrl = credentials.instanceUrl as string;
		const apiKey = credentials.gatewayApiKey as string;

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const signal = this.getExecutionCancelSignal();
			if (signal?.aborted) {
				throw new NodeOperationError(node, 'Execution was cancelled', { itemIndex });
			}

			const timeout = this.getNodeParameter('options.timeout', itemIndex, 60000) as number;
			const includeMode = this.getNodeParameter('include', itemIndex) as ToolIncludeMode;
			const includeTools = this.getNodeParameter('includeTools', itemIndex, []) as string[];
			const excludeTools = this.getNodeParameter('excludeTools', itemIndex, []) as string[];

			const item = items[itemIndex];
			if (!item.json.tool || typeof item.json.tool !== 'string') {
				throw new NodeOperationError(node, 'Tool name not found in item.json.tool', {
					itemIndex,
				});
			}

			const gatewayResponse = await fetchGatewayTools(instanceUrl, apiKey, timeout, node);
			const filteredTools = getSelectedTools(
				gatewayResponse.tools,
				includeMode,
				includeTools,
				excludeTools,
			);

			const toolName = item.json.tool;
			for (const tool of filteredTools) {
				const prefixedName = buildToolName(node.name, tool.name);
				if (toolName !== prefixedName) continue;

				const { tool: _, ...toolArguments } = item.json;
				const schema = tool.inputSchema;
				const sanitizedArgs: IDataObject =
					schema.additionalProperties !== true
						? pick(toolArguments, Object.keys(schema.properties ?? {}))
						: toolArguments;

				const result = await callGatewayTool(
					instanceUrl,
					apiKey,
					tool.name,
					sanitizedArgs as Record<string, unknown>,
					timeout,
					node,
				);

				returnData.push({
					json: {
						response: result.content as unknown as IDataObject,
						...(result.structuredContent && { structuredContent: result.structuredContent }),
					},
					pairedItem: { item: itemIndex },
				});
			}
		}

		return [returnData];
	}
}
