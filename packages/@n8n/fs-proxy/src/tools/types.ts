import type { z } from 'zod';

export type McpTextContent = { type: 'text'; text: string };

export type McpImageContent = {
	type: 'media';
	data: string;
	mediaType: string;
};

export interface CallToolResult<
	TContent extends Array<McpTextContent | McpImageContent> = Array<
		McpTextContent | McpImageContent
	>,
> {
	content: TContent;
	isError?: boolean;
}

export interface McpTool {
	name: string;
	description?: string;
	inputSchema: Record<string, unknown>;
}

export interface ToolContext {
	/** Base filesystem directory (used by filesystem tools) */
	dir: string;
}

export interface ToolAnnotations {
	/** Default permission level for this tool (not enforced yet) */
	defaultPermission?: 'allow' | 'confirm' | 'block';
	/** Tool only reads data, never mutates state */
	readOnly?: boolean;
	/** Tool can cause irreversible side effects */
	destructive?: boolean;
}

export interface ToolDefinition<
	TSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
	TContent extends McpTextContent | McpImageContent = McpTextContent | McpImageContent,
> {
	name: string;
	description: string;
	inputSchema: TSchema;
	annotations?: ToolAnnotations;
	execute(
		args: z.infer<TSchema>,
		context: ToolContext,
	): CallToolResult<TContent[]> | Promise<CallToolResult<TContent[]>>;
}

export interface ToolModule {
	/** Return false if this module cannot run on the current platform or lacks required permissions */
	isSupported(): boolean | Promise<boolean>;
	/** Tool definitions provided by this module */
	definitions: ToolDefinition[];
}
