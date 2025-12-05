import { StreamableHTTPTransport } from '@hono/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { BrowserTool } from '../tools/index.js';

interface Tools {
	browser: BrowserTool;
}

// Define Zod schema for MCP tool parameters
const browserToolSchema = {
	action: z.enum([
		// Navigation
		'goto',
		'goBack',
		'goForward',
		'reload',
		// Interaction
		'click',
		'type',
		'hover',
		'select',
		'scroll',
		'press',
		// Extraction
		'screenshot',
		'content',
		'text',
		'attribute',
		'evaluate',
		// Wait
		'waitForSelector',
		'waitForNavigation',
		'waitForTimeout',
		// Script
		'script',
	]),
	// Navigation params
	url: z.string().optional().describe('URL to navigate to'),
	waitUntil: z
		.enum(['load', 'domcontentloaded', 'networkidle0', 'networkidle2'])
		.optional()
		.describe('When to consider navigation complete'),
	// Selector params
	selector: z.string().optional().describe('CSS selector or XPath expression'),
	// Interaction params
	text: z.string().optional().describe('Text to type'),
	key: z.string().optional().describe('Key to press (e.g., Enter, Tab, Escape)'),
	value: z
		.union([z.string(), z.array(z.string())])
		.optional()
		.describe('Value(s) for select dropdown'),
	// Scroll params
	scrollDirection: z.enum(['up', 'down', 'left', 'right']).optional().describe('Scroll direction'),
	scrollAmount: z.number().optional().describe('Amount to scroll in pixels (default: 300)'),
	// Extraction params
	attribute: z.string().optional().describe('Attribute name to get from element'),
	// Screenshot params
	fullPage: z.boolean().optional().describe('Capture full page screenshot (default: false)'),
	// Evaluate/Script params
	script: z.string().optional().describe('JavaScript code to evaluate in browser context'),
	// Wait params
	timeout: z.number().optional().describe('Timeout in milliseconds (default: 30000)'),
};

/**
 * Create and configure the MCP server with browser tool
 */
export function createMcpServer(tools: Tools): McpServer {
	const server = new McpServer({
		name: 'browser-use',
		version: '1.0.0',
	});

	// Register browser tool
	server.tool(
		'browser',
		`Control a headless browser for web automation. Supports navigation (goto, goBack, goForward, reload),
interaction (click, type, hover, select, scroll, press),
extraction (screenshot, content, text, attribute, evaluate),
waiting (waitForSelector, waitForNavigation, waitForTimeout),
and custom script execution.`,
		browserToolSchema,
		async (params) => {
			const result = await tools.browser.execute(params);
			return formatToolResult(result);
		},
	);

	return server;
}

/**
 * Create the MCP transport for Streamable HTTP (stateless mode)
 */
export function createMcpTransport(): StreamableHTTPTransport {
	return new StreamableHTTPTransport({
		// Stateless mode: explicitly set sessionIdGenerator to undefined
		sessionIdGenerator: undefined,
	});
}

/**
 * Format tool result for MCP response
 */
function formatToolResult(result: { output?: string; error?: string; base64_image?: string }): {
	content: Array<
		{ type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string }
	>;
	isError?: boolean;
} {
	const content: Array<
		{ type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string }
	> = [];

	// Add text output if present
	if (result.output) {
		content.push({ type: 'text', text: result.output });
	}

	// Add error if present
	if (result.error) {
		content.push({ type: 'text', text: `Error: ${result.error}` });
	}

	// Add image if present
	if (result.base64_image) {
		content.push({
			type: 'image',
			data: result.base64_image,
			mimeType: 'image/png',
		});
	}

	// Ensure at least one content item
	if (content.length === 0) {
		content.push({ type: 'text', text: 'OK' });
	}

	return {
		content,
		isError: !!result.error,
	};
}
