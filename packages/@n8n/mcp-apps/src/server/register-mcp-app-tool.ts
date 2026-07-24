import type {
	CallToolResult,
	McpServer,
	RegisteredTool,
	ServerContext,
	StandardSchemaWithJSON,
} from '@modelcontextprotocol/server';
import { isRecord } from '@n8n/utils/is-record';
import { z } from 'zod/v4';

import { RESOURCE_URI_META_KEY } from './constants';

// The SDK's raw-shape overload wants classic ZodType-valued records; zod/v4's own
// ZodRawShape is core-$ZodType-valued and too loose for it.
type ZodShape = Record<string, z.ZodType>;

// zod/v4 in the pinned zod 3.25.x implements Standard Schema validation but not
// `~standard.jsonSchema` (added in zod 4.2). Grafting the converter on satisfies the
// SDK's schema-object contract without bumping zod.
// Duplicated in @n8n/mcp-browser/src/mcp-schema.ts (asMcpSchema) and
// packages/cli/src/modules/mcp/tools/schemas.ts (toMcpSchema) — no shared package to
// host a stopgap. Keep in sync; delete all copies once the zod pin reaches >=4.2.
function asMcpSchema<S extends z.ZodType>(
	schema: S,
): StandardSchemaWithJSON<z.input<S>, z.output<S>> {
	const jsonSchema = (io: 'input' | 'output') =>
		z.toJSONSchema(schema, { io }) as Record<string, unknown>;
	return {
		// eslint-disable-next-line @typescript-eslint/naming-convention -- Standard Schema spec key
		'~standard': {
			...schema['~standard'],
			jsonSchema: { input: () => jsonSchema('input'), output: () => jsonSchema('output') },
		},
	};
}

export type McpAppToolConfig<InputArgs extends ZodShape = ZodShape> = {
	title?: string;
	description?: string;
	inputSchema?: InputArgs;
	outputSchema?: ZodShape;
	annotations?: {
		title?: string;
		readOnlyHint?: boolean;
		destructiveHint?: boolean;
		idempotentHint?: boolean;
		openWorldHint?: boolean;
	};
	_meta: Record<string, unknown>;
};

// Narrower than the SDK's callback union (which also allows InputRequiredResult) so
// callers' assertions stay on plain CallToolResult.
export type McpAppToolHandler<InputArgs extends ZodShape = ZodShape> = (
	args: z.output<z.ZodObject<InputArgs>>,
	ctx: ServerContext,
) => CallToolResult | Promise<CallToolResult>;

export function registerMcpAppTool<InputArgs extends ZodShape = ZodShape>(
	server: Pick<McpServer, 'registerTool'>,
	name: string,
	config: McpAppToolConfig<InputArgs>,
	handler: McpAppToolHandler<InputArgs>,
): RegisteredTool {
	const { inputSchema, outputSchema, ...rest } = config;
	return server.registerTool(
		name,
		{
			...rest,
			inputSchema: inputSchema && asMcpSchema(z.object(inputSchema)),
			outputSchema: outputSchema && asMcpSchema(z.object(outputSchema)),
			_meta: normalizeMcpAppToolMeta(config._meta),
		},
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
