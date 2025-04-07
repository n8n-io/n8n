import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { Toolkit } from 'langchain/agents';
import { DynamicStructuredTool, type DynamicStructuredToolInput } from 'langchain/tools';
import { createResultError, createResultOk, type IDataObject, type Result } from 'n8n-workflow';
import type { ZodTypeAny } from 'zod';

import { convertJsonSchemaToZod } from '@utils/schemaParsing';

import type { McpSseCredential, McpTool, McpToolIncludeMode } from './types';

const DEFAULT_SSE_ENDPOINT = '/sse';
const DEFAULT_MESSAGES_ENDPOINT = '/messages';

export function getEndpoints(credential: McpSseCredential): { sse: string; messages: string } {
	if (credential.customEndpoints) {
		return {
			sse: credential.sseEndpoint ?? DEFAULT_SSE_ENDPOINT,
			messages: credential.messagesEndpoint ?? DEFAULT_MESSAGES_ENDPOINT,
		};
	}

	return { sse: DEFAULT_SSE_ENDPOINT, messages: DEFAULT_MESSAGES_ENDPOINT };
}

export function getHeaders(credential: McpSseCredential): HeadersInit {
	if (credential.authEnabled) {
		return {
			Authorization: `Bearer ${credential.token}`,
		};
	}

	return {};
}

export async function getAllTools(client: Client, cursor?: string): Promise<McpTool[]> {
	const { tools, nextCursor } = await client.listTools({ cursor });

	if (nextCursor) {
		return (tools as McpTool[]).concat(await getAllTools(client, nextCursor));
	}

	return tools as McpTool[];
}

export async function getSelectedTools({
	mode,
	includeTools,
	excludeTools,
	client,
}: {
	mode: McpToolIncludeMode;
	includeTools?: string[];
	excludeTools?: string[];
	client: Client;
}) {
	const allTools = await getAllTools(client);

	switch (mode) {
		case 'selected': {
			const include = new Set(includeTools ?? []);
			return allTools.filter((tool) => include.has(tool.name));
		}
		case 'except': {
			const except = new Set(excludeTools ?? []);
			return allTools.filter((tool) => !except.has(tool.name));
		}
		case 'all':
		default:
			return allTools;
	}
}

export const createCallTool =
	(name: string, client: Client, onError: (error: unknown) => void) =>
	async (args: IDataObject) => {
		const result = await client.callTool({ name, arguments: args });

		if (result.isError) {
			onError(result.content);
			return null;
		}

		return result.content;
	};

export function mcpToolToDynamicTool(
	tool: McpTool,
	onCallTool: DynamicStructuredToolInput['func'],
) {
	return new DynamicStructuredTool({
		name: tool.name,
		description: tool.description ?? '',
		schema: convertJsonSchemaToZod(tool.inputSchema),
		func: onCallTool,
		metadata: { isFromToolkit: true },
	});
}

export class McpToolkit extends Toolkit {
	constructor(public tools: Array<DynamicStructuredTool<ZodTypeAny>>) {
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

type ValidateUrlError = { type: 'no_path' } | { type: 'invalid'; error: Error };
function normalizeAndValidateBaseUrl(input: string): Result<URL, ValidateUrlError> {
	const withProtocol = !/^https?:\/\//i.test(input) ? `https://${input}` : input;
	const parsedUrl = safeCreateUrl(withProtocol);

	if (!parsedUrl.ok) {
		return createResultError({ type: 'invalid', error: parsedUrl.error });
	}
	if (parsedUrl.result.pathname !== '/' && parsedUrl.result.pathname !== '') {
		return createResultError({ type: 'no_path' });
	}

	return parsedUrl;
}

type ConnectMcpClientError =
	| { type: 'invalid_url'; error: Error }
	| { type: 'base_url_path' }
	| { type: 'connection'; error: Error };
export async function connectMcpClient({
	credential,
	version,
}: { credential: McpSseCredential; version: number }): Promise<
	Result<Client, ConnectMcpClientError>
> {
	try {
		const baseUrl = normalizeAndValidateBaseUrl(credential.url);

		if (!baseUrl.ok) {
			if (baseUrl.error.type === 'no_path') {
				return createResultError({ type: 'base_url_path' });
			}
			return createResultError({ type: 'invalid_url', error: baseUrl.error.error });
		}

		const endpoints = getEndpoints(credential);
		const headers = getHeaders(credential);
		const sseUrl = safeCreateUrl(endpoints.sse, baseUrl.result);
		const messagesUrl = safeCreateUrl(endpoints.messages, baseUrl.result);

		if (!sseUrl.ok) return createResultError({ type: 'invalid_url', error: sseUrl.error });
		if (!messagesUrl.ok)
			return createResultError({ type: 'invalid_url', error: messagesUrl.error });

		const transport = new SSEClientTransport(sseUrl.result, {
			// @ts-expect-error eventSourceInit type is not complete
			eventSourceInit: { headers },
			// @ts-expect-error requestInit type is not complete
			requestInit: { endpoint: messagesUrl.result, headers },
		});

		const client = new Client(
			{
				name: 'n8n-toolMcpClient',
				version: version.toString(),
			},
			{ capabilities: { tools: {} } },
		);

		await client.connect(transport);
		return createResultOk(client);
	} catch (error) {
		return createResultError({ type: 'connection', error });
	}
}
