import type {
	McpServer,
	RegisteredTool,
	ToolCallback,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import type z from 'zod';

export const RESOURCE_URI_META_KEY = 'ui/resourceUri';
export const RESOURCE_MIME_TYPE = 'text/html;profile=mcp-app';

export type McpAppToolConfig<InputArgs extends z.ZodRawShape = z.ZodRawShape> = {
	title?: string;
	description?: string;
	inputSchema?: InputArgs;
	outputSchema?: z.ZodRawShape;
	annotations?: ToolAnnotations;
	_meta: Record<string, unknown>;
};

export function registerMcpAppTool<InputArgs extends z.ZodRawShape = z.ZodRawShape>(
	server: Pick<McpServer, 'registerTool'>,
	name: string,
	config: McpAppToolConfig<InputArgs>,
	handler: ToolCallback<InputArgs>,
): RegisteredTool {
	return server.registerTool(
		name,
		{ ...config, _meta: normalizeMcpAppToolMeta(config._meta) },
		handler,
	);
}

function normalizeMcpAppToolMeta(meta: Record<string, unknown>): Record<string, unknown> {
	const uiMeta = isRecord(meta.ui) ? meta.ui : undefined;
	const modernUri = typeof uiMeta?.resourceUri === 'string' ? uiMeta.resourceUri : undefined;
	const legacyUri =
		typeof meta[RESOURCE_URI_META_KEY] === 'string' ? meta[RESOURCE_URI_META_KEY] : undefined;

	if (modernUri && !legacyUri) {
		return { ...meta, [RESOURCE_URI_META_KEY]: modernUri };
	}

	if (legacyUri && !modernUri) {
		return { ...meta, ui: { ...(uiMeta ?? {}), resourceUri: legacyUri } };
	}

	return meta;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
