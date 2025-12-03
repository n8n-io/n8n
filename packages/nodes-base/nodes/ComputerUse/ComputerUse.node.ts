import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { computerOperations, computerFields } from './ComputerDescription';
import { bashOperations, bashFields } from './BashDescription';
import { editorOperations, editorFields } from './EditorDescription';

type ComputerOperation =
	| 'screenshot'
	| 'cursor_position'
	| 'mouse_move'
	| 'left_click'
	| 'right_click'
	| 'middle_click'
	| 'double_click'
	| 'triple_click'
	| 'left_click_drag'
	| 'left_mouse_down'
	| 'left_mouse_up'
	| 'scroll'
	| 'type'
	| 'key'
	| 'hold_key'
	| 'wait';

type BashOperation = 'execute' | 'restart';

type EditorOperation = 'view' | 'create' | 'str_replace' | 'insert' | 'undo_edit';

type Resource = 'computer' | 'bash' | 'editor';

// Maps our resource names to MCP tool names
const RESOURCE_TO_MCP_TOOL: Record<Resource, string> = {
	computer: 'computer',
	bash: 'bash',
	editor: 'str_replace_editor',
};

interface McpToolCallRequest {
	jsonrpc: '2.0';
	id: number;
	method: 'tools/call';
	params: {
		name: string;
		arguments: IDataObject;
	};
}

interface McpToolCallResponse {
	jsonrpc: '2.0';
	id: number;
	result?: {
		content: Array<
			{ type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string }
		>;
		isError?: boolean;
	};
	error?: {
		code: number;
		message: string;
	};
}

function getComputerUseUrl(): string {
	const globalConfig = Container.get(GlobalConfig);
	return globalConfig.computerUse.url;
}

function buildComputerToolArgs(
	ctx: IExecuteFunctions,
	operation: ComputerOperation,
	itemIndex: number,
): IDataObject {
	const args: IDataObject = { action: operation };

	switch (operation) {
		case 'screenshot':
		case 'cursor_position':
		case 'left_mouse_down':
		case 'left_mouse_up':
			// No additional args needed
			break;

		case 'mouse_move':
		case 'left_click_drag': {
			const x = ctx.getNodeParameter('coordinateX', itemIndex) as number;
			const y = ctx.getNodeParameter('coordinateY', itemIndex) as number;
			args.coordinate = [x, y];
			break;
		}

		case 'left_click':
		case 'right_click':
		case 'middle_click':
		case 'double_click':
		case 'triple_click': {
			const x = ctx.getNodeParameter('coordinateX', itemIndex, 0) as number;
			const y = ctx.getNodeParameter('coordinateY', itemIndex, 0) as number;
			if (x !== 0 || y !== 0) {
				args.coordinate = [x, y];
			}
			break;
		}

		case 'scroll': {
			const scrollDirection = ctx.getNodeParameter('scrollDirection', itemIndex) as string;
			const scrollAmount = ctx.getNodeParameter('scrollAmount', itemIndex, 3) as number;
			const x = ctx.getNodeParameter('coordinateX', itemIndex, 0) as number;
			const y = ctx.getNodeParameter('coordinateY', itemIndex, 0) as number;
			args.scroll_direction = scrollDirection;
			args.scroll_amount = scrollAmount;
			if (x !== 0 || y !== 0) {
				args.coordinate = [x, y];
			}
			break;
		}

		case 'type':
		case 'key': {
			const text = ctx.getNodeParameter('text', itemIndex) as string;
			args.text = text;
			break;
		}

		case 'hold_key': {
			const text = ctx.getNodeParameter('text', itemIndex) as string;
			const duration = ctx.getNodeParameter('duration', itemIndex) as number;
			args.text = text;
			args.duration = duration;
			break;
		}

		case 'wait': {
			const duration = ctx.getNodeParameter('duration', itemIndex) as number;
			args.duration = duration;
			break;
		}
	}

	return args;
}

function buildBashToolArgs(
	ctx: IExecuteFunctions,
	operation: BashOperation,
	itemIndex: number,
): IDataObject {
	if (operation === 'restart') {
		return { restart: true };
	}

	const command = ctx.getNodeParameter('command', itemIndex) as string;
	return { command };
}

function buildEditorToolArgs(
	ctx: IExecuteFunctions,
	operation: EditorOperation,
	itemIndex: number,
): IDataObject {
	const path = ctx.getNodeParameter('path', itemIndex) as string;
	const args: IDataObject = { command: operation, path };

	switch (operation) {
		case 'view': {
			const viewRange = ctx.getNodeParameter('viewRange.range', itemIndex, null) as {
				startLine?: number;
				endLine?: number;
			} | null;
			if (viewRange?.startLine !== undefined && viewRange?.endLine !== undefined) {
				args.view_range = [viewRange.startLine, viewRange.endLine];
			}
			break;
		}

		case 'create': {
			const fileText = ctx.getNodeParameter('fileText', itemIndex) as string;
			args.file_text = fileText;
			break;
		}

		case 'str_replace': {
			const oldStr = ctx.getNodeParameter('oldStr', itemIndex) as string;
			const newStr = ctx.getNodeParameter('newStr', itemIndex) as string;
			args.old_str = oldStr;
			args.new_str = newStr;
			break;
		}

		case 'insert': {
			const insertLine = ctx.getNodeParameter('insertLine', itemIndex) as number;
			const newStr = ctx.getNodeParameter('newStr', itemIndex) as string;
			args.insert_line = insertLine;
			args.new_str = newStr;
			break;
		}

		case 'undo_edit':
			// Only path needed, already added
			break;
	}

	return args;
}

export class ComputerUse implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Computer Use',
		name: 'computerUse',
		icon: {
			light: 'file:computerUse.svg',
			dark: 'file:computerUse.dark.svg',
		},
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Control a computer through screen, keyboard, mouse, bash, and file operations',
		defaults: {
			name: 'Computer Use',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName:
					'This node requires the Computer Use API to be running and configured via the N8N_COMPUTER_USE_URL environment variable',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Computer',
						value: 'computer',
						description: 'Screen, keyboard, and mouse control',
					},
					{
						name: 'Bash',
						value: 'bash',
						description: 'Execute bash commands',
					},
					{
						name: 'Editor',
						value: 'editor',
						description: 'View and edit files',
					},
				],
				default: 'computer',
			},

			// Import operations and fields for each resource
			...computerOperations,
			...computerFields,
			...bashOperations,
			...bashFields,
			...editorOperations,
			...editorFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const endpointUrl = getComputerUseUrl();

		if (!endpointUrl) {
			throw new NodeOperationError(
				this.getNode(),
				'Computer Use API URL not configured. Set the N8N_COMPUTER_USE_URL environment variable.',
			);
		}

		const mcpUrl = endpointUrl.endsWith('/mcp') ? endpointUrl : `${endpointUrl}/mcp`;

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const resource = this.getNodeParameter('resource', itemIndex) as Resource;
			const operation = this.getNodeParameter('operation', itemIndex) as string;

			const mcpToolName = RESOURCE_TO_MCP_TOOL[resource];
			let args: IDataObject;

			switch (resource) {
				case 'computer':
					args = buildComputerToolArgs(this, operation as ComputerOperation, itemIndex);
					break;
				case 'bash':
					args = buildBashToolArgs(this, operation as BashOperation, itemIndex);
					break;
				case 'editor':
					args = buildEditorToolArgs(this, operation as EditorOperation, itemIndex);
					break;
				default:
					throw new NodeOperationError(this.getNode(), `Unknown resource: ${resource}`, {
						itemIndex,
					});
			}

			// Make MCP JSON-RPC call
			const request: McpToolCallRequest = {
				jsonrpc: '2.0',
				id: itemIndex + 1,
				method: 'tools/call',
				params: {
					name: mcpToolName,
					arguments: args,
				},
			};

			const response = await this.helpers.httpRequest({
				method: 'POST',
				url: mcpUrl,
				headers: {
					'Content-Type': 'application/json',
				},
				body: request,
				json: true,
			});

			const mcpResponse = response as McpToolCallResponse;

			if (mcpResponse.error) {
				throw new NodeOperationError(this.getNode(), `MCP Error: ${mcpResponse.error.message}`, {
					itemIndex,
				});
			}

			// Process response content
			const content = mcpResponse.result?.content ?? [];
			const textContent: string[] = [];
			let imageData: string | undefined;

			for (const item of content) {
				if (item.type === 'text') {
					textContent.push(item.text);
				} else if (item.type === 'image') {
					imageData = item.data;
				}
			}

			const outputItem: INodeExecutionData = {
				json: {
					resource,
					operation,
					output: textContent.join('\n'),
				},
				pairedItem: { item: itemIndex },
			};

			// If there's an image, add it as binary data
			if (imageData) {
				const binaryData = await this.helpers.prepareBinaryData(
					Buffer.from(imageData, 'base64'),
					'screenshot.png',
					'image/png',
				);
				outputItem.binary = { screenshot: binaryData };
			}

			returnData.push(outputItem);
		}

		return [returnData];
	}
}
