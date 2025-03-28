import type { DynamicStructuredTool, Tool } from '@langchain/core/tools';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { Service } from '@n8n/di';
import type * as express from 'express';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { FlushingSSEServerTransport } from './FlushingSSEServerTransport';

export class McpServerData {
	server: Server;

	id: number = Math.random();

	transport: FlushingSSEServerTransport | null = null;

	private _tools: Tool[] = [];

	constructor() {
		this.server = this.setUpServer();
	}

	async connectTransport(postUrl: string, resp: express.Response): Promise<void> {
		this.transport = new FlushingSSEServerTransport(postUrl, resp);
		await this.server.connect(this.transport);
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
			console.log(
				'tools',
				this._tools.map((tool) => tool.schema),
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
			/*
			return {
				tools: [
					{
						name: 'calculate_sum',
						description: 'Add two numbers together',
						inputSchema: {
							type: 'object',
							properties: {
								a: { type: 'number' },
								b: { type: 'number' },
							},
							required: ['a', 'b'],
						},
					},
				],
			};
				*/
		});

		server.setRequestHandler(CallToolRequestSchema, async (request) => {
			if (request.params.name === 'calculate_sum') {
				const args = request.params.arguments ?? {};
				const a = args.a as number;
				const b = args.b as number;
				return { toolResult: a + b };
			}

			const requestedTool = this._tools.filter((tool) => tool.name === request.params.name)?.[0];
			if (!requestedTool) {
				// eslint-disable-next-line n8n-local-rules/no-plain-errors
				throw new Error('Tool not found');
			}

			console.log(requestedTool);

			// @ts-ignore
			const result = await (requestedTool as DynamicStructuredTool).func(request.params.arguments);
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
