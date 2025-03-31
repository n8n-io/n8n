import { Tool } from '@langchain/core/tools';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { Service } from '@n8n/di';
import type * as express from 'express';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { FlushingSSEServerTransport } from './FlushingSSEServerTransport';

export class McpServerData {
	server: Server;

	id: number = Math.random();

	transports: { [sessionId: string]: FlushingSSEServerTransport } = {};

	private _tools: Tool[] = [];

	constructor() {
		this.server = this.setUpServer();
	}

	async connectTransport(postUrl: string, resp: express.Response): Promise<void> {
		const transport = new FlushingSSEServerTransport(postUrl, resp);
		this.transports[transport.sessionId] = transport;
		resp.on('close', () => {
			delete this.transports[transport.sessionId];
		});
		await this.server.connect(transport);

		// Make sure we flush the compression middleware, so that it's not waiting for more content to be added to the buffer
		// @ts-expect-error 2339
		if (resp.flush) {
			// @ts-expect-error 2339
			resp.flush();
		}
	}

	async handlePostMessage(req: express.Request, resp: express.Response, connectedTools: Tool[]) {
		const sessionId = req.query.sessionId as string;
		const transport = this.transports[sessionId];
		this._tools = connectedTools;
		if (transport) {
			await transport.handlePostMessage(req, resp, req.rawBody.toString());
		} else {
			resp.status(400).send('No transport found for sessionId');
		}

		// @ts-expect-error 2339
		if (resp.flush) {
			// @ts-expect-error 2339
			resp.flush();
		}
	}

	async setUpTools(tools: Tool[]) {
		this._tools = tools;
	}

	setUpServer(): Server {
		console.log('Setting up server in class');
		const server = new Server(
			{
				name: 'n8n-mcp-server',
				version: '0.1.0',
			},
			{
				capabilities: { tools: {} },
			},
		);

		server.setRequestHandler(ListToolsRequestSchema, async () => {
			console.log('getting tools');
			console.log(
				'tools',
				this._tools.map((tool) => tool.name),
			);
			return {
				tools: this._tools.map((tool) => {
					return {
						name: tool.name,
						description: tool.description,
						inputSchema: zodToJsonSchema(tool.schema),
					};
				}),
			};
		});

		server.setRequestHandler(CallToolRequestSchema, async (request) => {
			if (!request.params?.name || !request.params?.arguments) {
				// eslint-disable-next-line n8n-local-rules/no-plain-errors
				throw new Error('Require a name and arguments for the tool call');
			}

			const requestedTool: Tool | undefined = this._tools.filter(
				(tool) => tool.name === request.params.name,
			)?.[0];
			console.log('Requested tool', requestedTool.name);
			if (!requestedTool) {
				// eslint-disable-next-line n8n-local-rules/no-plain-errors
				throw new Error('Tool not found');
			}

			// TODO: fix this ts-ignore
			// TODO: Add propper logging / n8n logger wrapper stuff
			// @ts-ignore
			const result = await requestedTool.invoke(request.params.arguments);
			return { toolResult: result };
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
