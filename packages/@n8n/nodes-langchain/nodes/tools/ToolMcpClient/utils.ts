import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { CompatibilityCallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { Toolkit } from 'langchain/agents';
import { DynamicStructuredTool, type DynamicStructuredToolInput } from 'langchain/tools';
import get from 'lodash/get';
import { createResultError, createResultOk, type IDataObject, type Result } from 'n8n-workflow';
import { ZodError, type ZodTypeAny } from 'zod';

import { convertJsonSchemaToZod } from '@utils/schemaParsing';

import type { McpSseCredential, McpTool, McpToolIncludeMode } from './types';

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

export const createCallTool =
	(name: string, client: Client, onError: (error: unknown) => void) =>
	async (args: IDataObject) => {
		try {
			const result = await client.callTool(
				{ name, arguments: args },
				CompatibilityCallToolResultSchema,
			);

			if (result.toolResult !== undefined) {
				return result.toolResult;
			}

			if (result.content !== undefined) {
				return result.content;
			}

			return [];
		} catch (error) {
			onError(error);
			return null;
		}
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

function normalizeAndValidateBaseUrl(input: string): Result<URL, Error> {
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
	credential,
	name,
	version,
}: { credential: McpSseCredential; name: string; version: number }): Promise<
	Result<Client, ConnectMcpClientError>
> {
	try {
		const sseEndpoint = normalizeAndValidateBaseUrl(credential.sseEndpoint);

		if (!sseEndpoint.ok) {
			return createResultError({ type: 'invalid_url', error: sseEndpoint.error });
		}

		const headers = getHeaders(credential);

		const transport = new SSEClientTransport(sseEndpoint.result, {
			// @ts-expect-error eventSourceInit type is not complete
			eventSourceInit: { headers },
			requestInit: { headers },
		});

		const client = new Client(
			{ name, version: version.toString() },
			{ capabilities: { tools: {} } },
		);

		await client.connect(transport);
		return createResultOk(client);
	} catch (error) {
		return createResultError({ type: 'connection', error });
	}
}

export function getToolCallErrorDescription(error: unknown) {
	if (error instanceof ZodError) {
		return `<ul>
	${error.issues.map((issue) => `<li>${issue.path.join('.')}: ${issue.message}</li>`).join('\n')}
</ul`;
	}

	return get(error, 'message');
}
