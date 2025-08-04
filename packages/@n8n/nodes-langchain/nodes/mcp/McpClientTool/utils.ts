import { DynamicStructuredTool, type DynamicStructuredToolInput } from '@langchain/core/tools';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { CompatibilityCallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { convertJsonSchemaToZod } from '@utils/schemaParsing';
import { Toolkit } from 'langchain/agents';
import {
	createResultError,
	createResultOk,
	type IDataObject,
	type IExecuteFunctions,
	type Result,
} from 'n8n-workflow';
import { z } from 'zod';

import type {
	McpAuthenticationOption,
	McpServerTransport,
	McpTool,
	McpToolIncludeMode,
} from './types';

export async function getAllTools(client: Client, cursor?: string): Promise<McpTool[]> {
	const { tools, nextCursor } = await client.listTools({ cursor });

	if (nextCursor) {
		return (tools as McpTool[]).concat(await getAllTools(client, nextCursor));
	}

	return tools as McpTool[];
}

export function getSelectedTools({
	mode,
	includeTools,
	excludeTools,
	tools,
}: {
	mode: McpToolIncludeMode;
	includeTools?: string[];
	excludeTools?: string[];
	tools: McpTool[];
}) {
	switch (mode) {
		case 'selected': {
			if (!includeTools?.length) return tools;
			const include = new Set(includeTools);
			return tools.filter((tool) => include.has(tool.name));
		}
		case 'except': {
			const except = new Set(excludeTools ?? []);
			return tools.filter((tool) => !except.has(tool.name));
		}
		case 'all':
		default:
			return tools;
	}
}

export const getErrorDescriptionFromToolCall = (result: unknown): string | undefined => {
	if (result && typeof result === 'object') {
		if ('content' in result && Array.isArray(result.content)) {
			const errorMessage = (result.content as Array<{ type: 'text'; text: string }>).find(
				(content) => content && typeof content === 'object' && typeof content.text === 'string',
			)?.text;
			return errorMessage;
		} else if ('toolResult' in result && typeof result.toolResult === 'string') {
			return result.toolResult;
		}
		if ('message' in result && typeof result.message === 'string') {
			return result.message;
		}
	}

	return undefined;
};

export const createCallTool =
	(name: string, client: Client, onError: (error: string) => void) => async (args: IDataObject) => {
		let result: Awaited<ReturnType<Client['callTool']>>;

		function handleError(error: unknown) {
			const errorDescription =
				getErrorDescriptionFromToolCall(error) ?? `Failed to execute tool "${name}"`;
			onError(errorDescription);
			return errorDescription;
		}

		try {
			result = await client.callTool({ name, arguments: args }, CompatibilityCallToolResultSchema);
		} catch (error) {
			return handleError(error);
		}

		if (result.isError) {
			return handleError(result);
		}

		if (result.toolResult !== undefined) {
			return result.toolResult;
		}

		if (result.content !== undefined) {
			return result.content;
		}

		return result;
	};

export function mcpToolToDynamicTool(
	tool: McpTool,
	onCallTool: DynamicStructuredToolInput['func'],
): DynamicStructuredTool {
	const rawSchema = convertJsonSchemaToZod(tool.inputSchema);

	// Ensure we always have an object schema for structured tools
	const objectSchema =
		rawSchema instanceof z.ZodObject ? rawSchema : z.object({ value: rawSchema });

	return new DynamicStructuredTool({
		name: tool.name,
		description: tool.description ?? '',
		schema: objectSchema,
		func: onCallTool,
		metadata: { isFromToolkit: true },
	});
}

export class McpToolkit extends Toolkit {
	constructor(public tools: DynamicStructuredTool[]) {
		super();
	}
}

function safeCreateUrl(url: string, baseUrl?: string | URL): Result<URL, Error> {
	try {
		return createResultOk(new URL(url, baseUrl));
	} catch (error) {
		return createResultError(error);
	}
}

function normalizeAndValidateUrl(input: string): Result<URL, Error> {
	const withProtocol = !/^https?:\/\//i.test(input) ? `https://${input}` : input;
	const parsedUrl = safeCreateUrl(withProtocol);

	if (!parsedUrl.ok) {
		return createResultError(parsedUrl.error);
	}

	return parsedUrl;
}

type ConnectMcpClientError =
	| { type: 'invalid_url'; error: Error }
	| { type: 'connection'; error: Error };
export async function connectMcpClient({
	headers,
	serverTransport,
	endpointUrl,
	name,
	version,
}: {
	serverTransport: McpServerTransport;
	endpointUrl: string;
	headers?: Record<string, string>;
	name: string;
	version: number;
}): Promise<Result<Client, ConnectMcpClientError>> {
	const endpoint = normalizeAndValidateUrl(endpointUrl);

	if (!endpoint.ok) {
		return createResultError({ type: 'invalid_url', error: endpoint.error });
	}

	const client = new Client({ name, version: version.toString() }, { capabilities: { tools: {} } });

	if (serverTransport === 'httpStreamable') {
		try {
			const transport = new StreamableHTTPClientTransport(endpoint.result, {
				requestInit: { headers },
			});
			await client.connect(transport);
			return createResultOk(client);
		} catch (error) {
			return createResultError({ type: 'connection', error });
		}
	}

	try {
		const sseTransport = new SSEClientTransport(endpoint.result, {
			eventSourceInit: {
				fetch: async (url, init) =>
					await fetch(url, {
						...init,
						headers: {
							...headers,
							Accept: 'text/event-stream',
						},
					}),
			},
			requestInit: { headers },
		});
		await client.connect(sseTransport);
		return createResultOk(client);
	} catch (error) {
		return createResultError({ type: 'connection', error });
	}
}

export async function getAuthHeaders(
	ctx: Pick<IExecuteFunctions, 'getCredentials'>,
	authentication: McpAuthenticationOption,
): Promise<{ headers?: Record<string, string> }> {
	switch (authentication) {
		case 'headerAuth': {
			const header = await ctx
				.getCredentials<{ name: string; value: string }>('httpHeaderAuth')
				.catch(() => null);

			if (!header) return {};

			return { headers: { [header.name]: header.value } };
		}
		case 'bearerAuth': {
			const result = await ctx
				.getCredentials<{ token: string }>('httpBearerAuth')
				.catch(() => null);

			if (!result) return {};

			return { headers: { Authorization: `Bearer ${result.token}` } };
		}
		case 'none':
		default: {
			return {};
		}
	}
}
