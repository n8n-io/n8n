import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPTransport } from '@hono/mcp';
import { z } from 'zod';
import type { ComputerTool, BashTool, EditTool } from '../tools';

interface Tools {
	computer: ComputerTool;
	bash: BashTool;
	str_replace_editor: EditTool;
}

// Define Zod schemas for MCP tool parameters
// Note: Using z.array() instead of z.tuple() for OpenAI compatibility
const computerToolSchema = {
	action: z.enum([
		'screenshot',
		'cursor_position',
		'mouse_move',
		'left_click',
		'right_click',
		'middle_click',
		'double_click',
		'triple_click',
		'left_click_drag',
		'left_mouse_down',
		'left_mouse_up',
		'scroll',
		'type',
		'key',
		'hold_key',
		'wait',
		'zoom',
	]),
	coordinate: z
		.array(z.number())
		.optional()
		.describe('X,Y coordinates for mouse actions [x, y]. For zoom action, use region instead.'),
	region: z
		.array(z.number())
		.optional()
		.describe('Region coordinates for zoom action [x0, y0, x1, y1]'),
	text: z.string().optional().describe('Text for type/key actions'),
	scroll_amount: z.number().optional().describe('Amount to scroll'),
	scroll_direction: z.enum(['up', 'down', 'left', 'right']).optional(),
	duration: z.number().optional().describe('Duration in seconds for wait/hold_key actions'),
};

const bashToolSchema = {
	command: z.string().optional().describe('Bash command to execute'),
	restart: z.boolean().optional().describe('Restart the bash session'),
};

const editToolSchema = {
	command: z.enum(['view', 'create', 'str_replace', 'insert', 'undo_edit']),
	path: z.string().describe('Absolute path to the file'),
	view_range: z.array(z.number()).optional().describe('Line range to view [start, end]'),
	file_text: z.string().optional().describe('Content for new file'),
	old_str: z.string().optional().describe('Text to replace'),
	new_str: z.string().optional().describe('Replacement text'),
	insert_line: z.number().optional().describe('Line number for insertion'),
};

/**
 * Create and configure the MCP server with computer use tools
 */
export function createMcpServer(tools: Tools): McpServer {
	const server = new McpServer({
		name: 'computer-use',
		version: '1.0.0',
	});

	// Register computer tool
	server.tool(
		'computer',
		'Control computer screen, keyboard, and mouse. Supports screenshot, click, type, scroll, and other actions.',
		computerToolSchema,
		async (params) => {
			// Convert arrays to tuples for internal implementation
			const input: Record<string, unknown> = { ...params };
			if (params.coordinate && Array.isArray(params.coordinate)) {
				input.coordinate = params.coordinate as [number, number];
			}
			if (params.region && Array.isArray(params.region)) {
				input.region = params.region as [number, number, number, number];
			}
			const result = await tools.computer.execute(input);
			return formatToolResult(result);
		},
	);

	// Register bash tool
	server.tool(
		'bash',
		'Execute bash commands in a persistent shell session. Commands run in the same session, preserving environment and working directory.',
		bashToolSchema,
		async (params) => {
			const result = await tools.bash.execute(params);
			return formatToolResult(result);
		},
	);

	// Register str_replace_editor tool
	server.tool(
		'str_replace_editor',
		'View and edit files. Supports viewing file contents, creating files, replacing text, and inserting at specific lines.',
		editToolSchema,
		async (params) => {
			// Convert arrays to tuples for internal implementation
			const input: Record<string, unknown> = { ...params };
			if (params.view_range && Array.isArray(params.view_range)) {
				input.view_range = params.view_range as [number, number];
			}
			const result = await tools.str_replace_editor.execute(input);
			return formatToolResult(result);
		},
	);

	return server;
}

/**
 * Create the MCP transport for Streamable HTTP (stateless mode)
 * Setting sessionIdGenerator to undefined disables session management
 */
export function createMcpTransport(): StreamableHTTPTransport {
	return new StreamableHTTPTransport({
		// Stateless mode: explicitly set sessionIdGenerator to undefined
		// This bypasses session validation, allowing each request to be independent
		sessionIdGenerator: undefined,
	});
}

/**
 * Format tool result for MCP response
 */
function formatToolResult(result: {
	output?: string;
	error?: string;
	base64_image?: string;
	system?: string;
}): {
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

	// Add system message if present
	if (result.system) {
		content.push({ type: 'text', text: `System: ${result.system}` });
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
