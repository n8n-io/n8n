import type { Tool } from '@langchain/core/tools';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import {
	JSONRPCMessageSchema,
	ListToolsRequestSchema,
	CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Service } from '@n8n/di';
import type * as express from 'express';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { FlushingSSEServerTransport } from './FlushingSSEServerTransport';
import type { CompressionResponse } from './FlushingSSEServerTransport';

/**
 * Parses the JSONRPC message and checks whether the method used was a tool
 * call. This is necessary in order to not have executions for listing tools
 * and other commands sent by the MCP client
 */
function wasToolCall(body: string) {
	try {
		const message: unknown = JSON.parse(body);
		const parsedMessage: JSONRPCMessage = JSONRPCMessageSchema.parse(message);
		return (
			'method' in parsedMessage &&
			'id' in parsedMessage &&
			parsedMessage?.method === CallToolRequestSchema.shape.method.value
		);
	} catch {
		return false;
	}
}

export class McpServerData {
	server: Server;

	id: number = Math.random();

	transports: { [sessionId: string]: FlushingSSEServerTransport } = {};

	private _tools: { [sessionId: string]: Tool[] } = {};

	private _resolveFunctions: { [sessionId: string]: CallableFunction } = {};

	constructor() {
		this.server = this.setUpServer();
	}

	async connectTransport(postUrl: string, resp: CompressionResponse): Promise<void> {
		const transport = new FlushingSSEServerTransport(postUrl, resp);
		this.transports[transport.sessionId] = transport;
		resp.on('close', () => {
			delete this.transports[transport.sessionId];
		});
		await this.server.connect(transport);

		// Make sure we flush the compression middleware, so that it's not waiting for more content to be added to the buffer
		if (resp.flush) {
			resp.flush();
		}
	}

	async handlePostMessage(req: express.Request, resp: CompressionResponse, connectedTools: Tool[]) {
		const sessionId = req.query.sessionId as string;
		const transport = this.transports[sessionId];
		this._tools[sessionId] = connectedTools;
		if (transport) {
			await new Promise(async (resolve) => {
				this._resolveFunctions[sessionId] = resolve;
				await transport.handlePostMessage(req, resp, req.rawBody.toString());
			});
			delete this._resolveFunctions[sessionId];
		} else {
			resp.status(400).send('No transport found for sessionId');
		}

		if (resp.flush) {
			resp.flush();
		}

		delete this._tools[sessionId]; // Clean up to avoid keeping all tools in memory

		return wasToolCall(req.rawBody.toString());
	}

	setUpServer(): Server {
		const server = new Server(
			{
				name: 'n8n-mcp-server',
				version: '0.1.0',
			},
			{
				capabilities: { tools: {} },
			},
		);

		server.setRequestHandler(ListToolsRequestSchema, async (_, extra: RequestHandlerExtra) => {
			if (!extra.sessionId) {
				// eslint-disable-next-line n8n-local-rules/no-plain-errors
				throw new Error('Require a sessionId for the listing of tools');
			}
			return {
				tools: this._tools[extra.sessionId].map((tool) => {
					return {
						name: tool.name,
						description: tool.description,
						inputSchema: zodToJsonSchema(tool.schema),
					};
				}),
			};
		});

		server.setRequestHandler(CallToolRequestSchema, async (request, extra: RequestHandlerExtra) => {
			if (!request.params?.name || !request.params?.arguments) {
				// eslint-disable-next-line n8n-local-rules/no-plain-errors
				throw new Error('Require a name and arguments for the tool call');
			}
			if (!extra.sessionId) {
				// eslint-disable-next-line n8n-local-rules/no-plain-errors
				throw new Error('Require a sessionId for the tool call');
			}

			const requestedTool: Tool | undefined = this._tools[extra.sessionId].find(
				(tool) => tool.name === request.params.name,
			);
			if (!requestedTool) {
				// eslint-disable-next-line n8n-local-rules/no-plain-errors
				throw new Error('Tool not found');
			}

			try {
				const result = await requestedTool.invoke(request.params.arguments);

				this._resolveFunctions[extra.sessionId]();

				// TODO: Refactor this to no longer use the legacy tool result, but
				return { toolResult: result };
			} catch (error) {
				console.error(error);
				return { isError: true, content: [{ type: 'text', text: `Error: ${error.message}` }] };
			}
		});

		server.onclose = () => {
			console.log('!!! CLOSING SERVER !!!');
		};
		server.onerror = (error: any) => {
			console.log('!!! MCP ERROR', error);
		};
		return server;
	}
}

@Service()
export class McpServers {
	static #instance: McpServers;

	private _serverData: McpServerData;

	private constructor() {
		this._serverData = new McpServerData();
	}

	static get instance(): McpServers {
		if (!McpServers.#instance) {
			console.log('Setting up new singleton');
			McpServers.#instance = new McpServers();
		}

		return McpServers.#instance;
	}

	get serverData() {
		return this._serverData;
	}
}
