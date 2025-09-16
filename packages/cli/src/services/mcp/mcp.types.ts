import { type ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import type z from 'zod';

export type ToolDefinition<InputArgs extends z.ZodRawShape = z.ZodRawShape> = {
	name: string;
	config: {
		description?: string;
		inputSchema?: InputArgs;
	};
	handler: ToolCallback<InputArgs>;
};
