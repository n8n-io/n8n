import { DynamicStructuredTool, type DynamicStructuredToolInput } from '@langchain/core/tools';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { CompatibilityCallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { ClientOAuth2 } from '@n8n/client-oauth2';
import { createHmac } from 'crypto';
import { Toolkit } from 'langchain/agents';
import {
	createResultError,
	createResultOk,
	IRequestOptionsSimplified,
	jsonParse,
	type IDataObject,
	type IExecuteFunctions,
	type Result,
} from 'n8n-workflow';
import clientOAuth1 from 'oauth-1.0a';
import type { Token } from 'oauth-1.0a';
import { z } from 'zod';

import { convertJsonSchemaToZod } from '@utils/schemaParsing';

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
	ctx: Pick<IExecuteFunctions, 'getCredentials' | 'getNodeParameter' | 'logger'>,
	authentication: McpAuthenticationOption,
	itemIndex?: number,
): Promise<{ headers?: Record<string, string> }> {
	switch (authentication) {
		case 'genericCredentialType': {
			const genericCredentialType = ctx.getNodeParameter('genericAuthType', 0);

			const credentials = await ctx.getCredentials(genericCredentialType as string, itemIndex);
			ctx.logger.error(JSON.stringify(credentials));
			if (!credentials) {
				return {};
			}

			if (genericCredentialType === 'httpBasicAuth') {
				const username = credentials.user as string;
				const password = credentials.password as string;
				return { headers: { Authorization: `Basic ${btoa(`${username}:${password}`)}` } };
			} else if (genericCredentialType === 'httpBearerAuth') {
				const token = credentials.token as string;
				return { headers: { Authorization: `Bearer ${token}` } };
			} else if (genericCredentialType === 'httpHeaderAuth') {
				const result: Record<string, string> = {};
				result[credentials.name as string] = credentials.value as string;
				return { headers: result };
			} else if (genericCredentialType === 'httpCustomAuth') {
				const customAuth = jsonParse<IRequestOptionsSimplified>(
					(credentials.json as string) || '{}',
					{ errorMessage: 'Invalid Custom Auth JSON' },
				);
				const result = { ...customAuth.headers } as Record<string, string>;
				return { headers: result };
			} else if (genericCredentialType === 'oAuth1Api') {
				const oauth = new clientOAuth1({
					consumer: {
						key: credentials.consumerKey as string,
						secret: credentials.consumerSecret as string,
					},
					signature_method: credentials.signatureMethod as string,
					hash_function(base, key) {
						let algorithm: string;
						switch (credentials.signatureMethod) {
							case 'HMAC-SHA256':
								algorithm = 'sha256';
								break;
							case 'HMAC-SHA512':
								algorithm = 'sha512';
								break;
							default:
								algorithm = 'sha1';
								break;
						}
						return createHmac(algorithm, key).update(base).digest('base64');
					},
				});
				const oauthTokenData = credentials.oauthTokenData as IDataObject;

				const token: Token = {
					key: oauthTokenData.oauth_token as string,
					secret: oauthTokenData.oauth_token_secret as string,
				};
				return oauth.toHeader(
					// todo: how does oauth1 work?
					oauth.authorize({} as unknown as clientOAuth1.RequestOptions, token),
				) as unknown as Record<string, string>;
			} else if (genericCredentialType === 'oAuth2Api') {
				const oauth2Client = new ClientOAuth2({
					clientId: credentials.clientId as string,
					clientSecret: credentials.clientSecret as string,
					accessTokenUri: credentials.accessTokenUrl as string,
					authentication: credentials.authentication as 'header' | 'body',
					scopes: (credentials.scope as string)?.split(','),
					ignoreSSLIssues: credentials.ignoreSSLIssues as boolean,
				});

				try {
					const token = await oauth2Client.credentials.getToken();
					if (token.accessToken) {
						return { headers: { Authorization: `Bearer ${token.accessToken}` } };
					}
				} catch (error) {
					return {};
				}
			}
			return {};
		}
		case 'none':
			return {};
		default: {
			return {};
		}
	}
}
