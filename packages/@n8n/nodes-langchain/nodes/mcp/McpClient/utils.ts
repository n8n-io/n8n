import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport';
import {
	createResultError,
	createResultOk,
	type IExecuteFunctions,
	type Result,
} from 'n8n-workflow';

import type { McpAuthenticationOption, McpServerTransport } from './types';

// export const getErrorDescriptionFromToolCall = (result: unknown): string | undefined => {
// 	if (result && typeof result === 'object') {
// 		if ('content' in result && Array.isArray(result.content)) {
// 			const errorMessage = (result.content as Array<{ type: 'text'; text: string }>).find(
// 				(content) => content && typeof content === 'object' && typeof content.text === 'string',
// 			)?.text;
// 			return errorMessage;
// 		} else if ('toolResult' in result && typeof result.toolResult === 'string') {
// 			return result.toolResult;
// 		}
// 		if ('message' in result && typeof result.message === 'string') {
// 			return result.message;
// 		}
// 	}

// 	return undefined;
// };

// export const createCallTool =
// 	(name: string, client: Client, onError: (error: string | undefined) => void) =>
// 	async (args: IDataObject) => {
// 		let result: Awaited<ReturnType<Client['callTool']>>;
// 		try {
// 			result = await client.callTool({ name, arguments: args }, CompatibilityCallToolResultSchema);
// 		} catch (error) {
// 			return onError(getErrorDescriptionFromToolCall(error));
// 		}

// 		if (result.isError) {
// 			return onError(getErrorDescriptionFromToolCall(result));
// 		}

// 		if (result.toolResult !== undefined) {
// 			return result.toolResult;
// 		}

// 		if (result.content !== undefined) {
// 			return result.content;
// 		}

// 		return result;
// 	};

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
	mcpServerUrl,
	name,
	version,
}: {
	serverTransport: McpServerTransport;
	mcpServerUrl: string;
	headers?: Record<string, string>;
	name: string;
	version: number;
}): Promise<Result<Client, ConnectMcpClientError>> {
	const endpoint = normalizeAndValidateUrl(mcpServerUrl);
	if (!endpoint.ok) {
		return createResultError({ type: 'invalid_url', error: endpoint.error });
	}

	try {
		const client = new Client(
			{ name, version: version.toString() },
			{ capabilities: { tools: {} } },
		);
		let transport: Transport;

		if (serverTransport === 'sse') {
			transport = new SSEClientTransport(endpoint.result, {
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
		} else {
			transport = new StreamableHTTPClientTransport(endpoint.result, {
				requestInit: {
					headers,
				},
			});
		}

		await client.connect(transport);
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
