import { DynamicStructuredTool } from '@langchain/core/tools';
import { getConnectionHintNoticeField, logWrapper } from '@n8n/ai-utilities';
import type { JSONSchema7 } from 'json-schema';
import pick from 'lodash/pick';
import { StructuredToolkit } from 'n8n-core';
import {
	type GatewayToolCallResult,
	type GatewayToolInfo,
	type IDataObject,
	type IExecuteFunctions,
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

type ToolIncludeMode = 'all' | 'selected' | 'except';

function getSelectedTools(
	tools: GatewayToolInfo[],
	mode: ToolIncludeMode,
	includeTools: string[],
	excludeTools: string[],
): GatewayToolInfo[] {
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

function extractTextFromResult(result: GatewayToolCallResult): string {
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
		icon: 'fa:monitor',
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
						displayName: 'Auto-Approve Permissions',
						name: 'autoApprovePermissions',
						type: 'boolean',
						default: true,
						description:
							'Whether to automatically approve resource access requests from the device. When disabled, tool calls requiring confirmation will fail.',
					},
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
				if (!this.getGatewayTools) {
					return [];
				}

				try {
					const { tools } = await this.getGatewayTools();
					return tools.map((tool) => ({
						name: tool.name,
						value: tool.name,
						description: tool.description,
					}));
				} catch {
					return [];
				}
			},
		},
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		if (!this.getGatewayTools || !this.callGatewayTool) {
			throw new NodeOperationError(this.getNode(), 'Computer Use requires gateway support');
		}
		const getGatewayTools = this.getGatewayTools.bind(this);
		const callGatewayTool = this.callGatewayTool.bind(this);

		const node = this.getNode();
		const credentials = await this.getCredentials('deviceConnectionApi');
		const deviceOwnerId = (credentials.deviceOwnerId as string) || undefined;
		const includeMode = this.getNodeParameter('include', itemIndex) as ToolIncludeMode;
		const includeTools = this.getNodeParameter('includeTools', itemIndex, []) as string[];
		const excludeTools = this.getNodeParameter('excludeTools', itemIndex, []) as string[];
		const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;
		const autoApprovePermissions = (options.autoApprovePermissions as boolean) ?? true;

		const setError = (error: NodeOperationError): SupplyData => {
			this.addOutputData(NodeConnectionTypes.AiTool, itemIndex, error);
			throw error;
		};

		let gatewayResponse;
		try {
			gatewayResponse = await getGatewayTools(deviceOwnerId);
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
			const rawSchema = convertJsonSchemaToZod(tool.inputSchema as JSONSchema7);
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
						const callArgs = autoApprovePermissions
							? { ...(args as Record<string, unknown>), _confirmation: 'allowForSession' }
							: (args as Record<string, unknown>);
						const result = await callGatewayTool(tool.name, callArgs, deviceOwnerId);

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
		if (!this.getGatewayTools || !this.callGatewayTool) {
			throw new NodeOperationError(this.getNode(), 'Computer Use requires gateway support');
		}
		const getGatewayTools = this.getGatewayTools.bind(this);
		const callGatewayTool = this.callGatewayTool.bind(this);

		const node = this.getNode();
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const credentials = await this.getCredentials('deviceConnectionApi');
		const deviceOwnerId = (credentials.deviceOwnerId as string) || undefined;
		const execOptions = this.getNodeParameter('options', 0, {}) as IDataObject;
		const autoApprovePermissions = (execOptions.autoApprovePermissions as boolean) ?? true;

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const signal = this.getExecutionCancelSignal();
			if (signal?.aborted) {
				throw new NodeOperationError(node, 'Execution was cancelled', { itemIndex });
			}

			const includeMode = this.getNodeParameter('include', itemIndex) as ToolIncludeMode;
			const includeTools = this.getNodeParameter('includeTools', itemIndex, []) as string[];
			const excludeTools = this.getNodeParameter('excludeTools', itemIndex, []) as string[];

			const item = items[itemIndex];
			if (!item.json.tool || typeof item.json.tool !== 'string') {
				throw new NodeOperationError(node, 'Tool name not found in item.json.tool', {
					itemIndex,
				});
			}

			const gatewayResponse = await getGatewayTools(deviceOwnerId);
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
					(schema as Record<string, unknown>).additionalProperties !== true
						? pick(toolArguments, Object.keys((schema as { properties?: object }).properties ?? {}))
						: toolArguments;

				const callArgs = autoApprovePermissions
					? { ...(sanitizedArgs as Record<string, unknown>), _confirmation: 'allowForSession' }
					: (sanitizedArgs as Record<string, unknown>);
				const result = await callGatewayTool(tool.name, callArgs, deviceOwnerId);

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
