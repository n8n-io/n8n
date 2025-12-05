import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
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

import { extractionFields, extractionOperations } from './ExtractionDescription';
import { interactionFields, interactionOperations } from './InteractionDescription';
import { navigationFields, navigationOperations } from './NavigationDescription';
import { scriptFields, scriptOperations } from './ScriptDescription';
import { waitFields, waitOperations } from './WaitDescription';
import { connectMcpClient, mapToNodeOperationError } from '../mcp/shared/utils';

type BrowserAction =
	// Navigation
	| 'goto'
	| 'goBack'
	| 'goForward'
	| 'reload'
	// Interaction
	| 'click'
	| 'type'
	| 'hover'
	| 'select'
	| 'scroll'
	| 'press'
	// Extraction
	| 'screenshot'
	| 'content'
	| 'text'
	| 'attribute'
	| 'evaluate'
	// Wait
	| 'waitForSelector'
	| 'waitForNavigation'
	| 'waitForTimeout'
	// Script
	| 'script';

type Resource = 'navigation' | 'interaction' | 'extraction' | 'wait' | 'script';

function getBrowserUseUrl(): string {
	const globalConfig = Container.get(GlobalConfig);
	return globalConfig.browserUse.url;
}

function buildBrowserToolArgs(
	ctx: IExecuteFunctions,
	resource: Resource,
	operation: BrowserAction,
	itemIndex: number,
): IDataObject {
	const args: IDataObject = { action: operation };

	switch (resource) {
		case 'navigation':
			if (operation === 'goto') {
				args.url = ctx.getNodeParameter('url', itemIndex) as string;
			}
			args.waitUntil = ctx.getNodeParameter('waitUntil', itemIndex, 'load') as string;
			args.timeout = ctx.getNodeParameter('timeout', itemIndex, 30000) as number;
			break;

		case 'interaction':
			if (['click', 'type', 'hover', 'select'].includes(operation)) {
				args.selector = ctx.getNodeParameter('selector', itemIndex) as string;
				args.timeout = ctx.getNodeParameter('timeout', itemIndex, 30000) as number;
			}
			if (operation === 'type') {
				args.text = ctx.getNodeParameter('text', itemIndex) as string;
			}
			if (operation === 'press') {
				args.key = ctx.getNodeParameter('key', itemIndex) as string;
			}
			if (operation === 'select') {
				const value = ctx.getNodeParameter('value', itemIndex) as string;
				// Handle comma-separated values for multi-select
				args.value = value.includes(',') ? value.split(',').map((v) => v.trim()) : value;
			}
			if (operation === 'scroll') {
				args.scrollDirection = ctx.getNodeParameter('scrollDirection', itemIndex, 'down') as string;
				args.scrollAmount = ctx.getNodeParameter('scrollAmount', itemIndex, 300) as number;
			}
			break;

		case 'extraction':
			if (['text', 'attribute', 'screenshot'].includes(operation)) {
				const selector = ctx.getNodeParameter('selector', itemIndex, '') as string;
				if (selector) {
					args.selector = selector;
				}
			}
			if (operation === 'attribute') {
				args.attribute = ctx.getNodeParameter('attribute', itemIndex) as string;
			}
			if (operation === 'screenshot') {
				args.fullPage = ctx.getNodeParameter('fullPage', itemIndex, false) as boolean;
			}
			if (operation === 'evaluate') {
				args.script = ctx.getNodeParameter('script', itemIndex) as string;
			}
			break;

		case 'wait':
			if (operation === 'waitForSelector') {
				args.selector = ctx.getNodeParameter('selector', itemIndex) as string;
				args.timeout = ctx.getNodeParameter('timeout', itemIndex, 30000) as number;
			}
			if (operation === 'waitForNavigation') {
				args.waitUntil = ctx.getNodeParameter('waitUntil', itemIndex, 'load') as string;
				args.timeout = ctx.getNodeParameter('timeout', itemIndex, 30000) as number;
			}
			if (operation === 'waitForTimeout') {
				args.timeout = ctx.getNodeParameter('timeout', itemIndex, 1000) as number;
			}
			break;

		case 'script':
			args.script = ctx.getNodeParameter('script', itemIndex) as string;
			args.timeout = ctx.getNodeParameter('timeout', itemIndex, 60000) as number;
			break;
	}

	return args;
}

export class BrowserUse implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Browser Use',
		name: 'browserUse',
		icon: {
			light: 'file:browserUse.svg',
			dark: 'file:browserUse.dark.svg',
		},
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Automate browser interactions using Puppeteer for web scraping and testing',
		defaults: {
			name: 'Browser Use',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName:
					'This node requires the Browser Use API to be running and configured via the N8N_BROWSER_USE_URL environment variable',
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
						name: 'Extraction',
						value: 'extraction',
						description: 'Extract data from pages (screenshots, text, HTML)',
					},
					{
						name: 'Interaction',
						value: 'interaction',
						description: 'Interact with page elements (click, type, scroll)',
					},
					{
						name: 'Navigation',
						value: 'navigation',
						description: 'Navigate to URLs and control browser history',
					},
					{
						name: 'Script',
						value: 'script',
						description: 'Execute custom Puppeteer scripts',
					},
					{
						name: 'Wait',
						value: 'wait',
						description: 'Wait for elements or events',
					},
				],
				default: 'navigation',
			},

			// Import operations and fields for each resource
			...navigationOperations,
			...navigationFields,
			...interactionOperations,
			...interactionFields,
			...extractionOperations,
			...extractionFields,
			...waitOperations,
			...waitFields,
			...scriptOperations,
			...scriptFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const endpointUrl = getBrowserUseUrl();

		if (!endpointUrl) {
			throw new NodeOperationError(
				this.getNode(),
				'Browser Use API URL not configured. Set the N8N_BROWSER_USE_URL environment variable.',
			);
		}

		// Ensure URL has /mcp suffix for MCP protocol
		const mcpUrl = endpointUrl.endsWith('/mcp') ? endpointUrl : `${endpointUrl}/mcp`;

		const node = this.getNode();

		// Connect to the MCP server using the SDK
		const client = await connectMcpClient({
			serverTransport: 'httpStreamable',
			endpointUrl: mcpUrl,
			name: node.type,
			version: node.typeVersion,
		});

		if (!client.ok) {
			throw mapToNodeOperationError(node, client.error);
		}

		try {
			for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
				const resource = this.getNodeParameter('resource', itemIndex) as Resource;
				const operation = this.getNodeParameter('operation', itemIndex) as BrowserAction;

				const args = buildBrowserToolArgs(this, resource, operation, itemIndex);

				// Call the MCP tool using the SDK
				const result = (await client.result.callTool({
					name: 'browser',
					arguments: args,
				})) as CallToolResult;

				// Check for error in result
				if (result.isError) {
					const errorText = result.content
						.filter((item): item is { type: 'text'; text: string } => item.type === 'text')
						.map((item) => item.text)
						.join('\n');
					throw new NodeOperationError(this.getNode(), `Browser Use Error: ${errorText}`, {
						itemIndex,
					});
				}

				// Process response content
				const textContent: string[] = [];
				let imageData: string | undefined;

				for (const contentItem of result.content) {
					if (contentItem.type === 'text') {
						textContent.push(contentItem.text);
					} else if (contentItem.type === 'image') {
						imageData = contentItem.data;
					}
				}

				const outputItem: INodeExecutionData = {
					json: {
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
		} finally {
			// Clean up the MCP client connection
			await client.result.close();
		}

		return [returnData];
	}
}
