import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Service } from '@n8n/di';
import { lazyImport } from '@n8n/utils/lazy-import';
import {
	isSafeObjectProperty,
	setSafeObjectProperty,
	type INodeParameters,
	type NodeParameterValueType,
} from 'n8n-workflow';
import { z } from 'zod';

import { NodeMcpPocRegistry } from './node-mcp-poc.registry';
import type { CompiledNodeToolset, CompiledOperationTool } from './node-mcp-poc.types';
import { NodeToolExecutorService } from './node-tool-executor.service';
import { NodeToolResolverService } from './node-tool-resolver.service';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toolContent(value: unknown) {
	if (isRecord(value)) return { content: [], structuredContent: value };
	return {
		content: [
			{
				type: 'text' as const,
				text: typeof value === 'string' ? value : (JSON.stringify(value) ?? String(value)),
			},
		],
	};
}

function toolError(error: unknown) {
	const message = error instanceof Error ? error.message : 'Node MCP tool call failed';
	return {
		content: [],
		structuredContent: { error: message },
		isError: true as const,
	};
}

async function toolResult(execute: () => Promise<unknown>) {
	try {
		return toolContent(await execute());
	} catch (error) {
		return toolError(error);
	}
}

function isScalar(value: unknown): value is string | number | boolean | null | undefined {
	return (
		value === null ||
		value === undefined ||
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean'
	);
}

export function findTool(toolset: CompiledNodeToolset, name: string) {
	const exactMatch = toolset.tools.find((candidate) => candidate.name === name);
	if (exactMatch) return exactMatch;

	const suffixMatches = toolset.tools
		.filter((candidate) => name.endsWith(candidate.name))
		.sort((left, right) => right.name.length - left.name.length);
	const longestMatch = suffixMatches[0];
	if (!longestMatch) throw new Error(`Unknown operation tool: ${name}`);
	if (suffixMatches[1] !== undefined && suffixMatches[1].name.length === longestMatch.name.length) {
		throw new Error(`Ambiguous operation tool: ${name}`);
	}
	return longestMatch;
}

function toNodeParameterValue(value: unknown): NodeParameterValueType {
	if (
		value === null ||
		value === undefined ||
		typeof value === 'number' ||
		typeof value === 'boolean'
	) {
		return value;
	}
	if (typeof value === 'string') {
		return value;
	}
	if (Array.isArray(value)) {
		if (value.every(isScalar)) return value;
		if (
			value.every((child) => typeof child === 'object' && child !== null && !Array.isArray(child))
		) {
			return value.map(toNodeParameters);
		}
		throw new Error('Node parameter arrays must contain only scalars or only objects');
	}
	if (typeof value !== 'object') throw new Error('Unsupported node parameter value');
	return toNodeParameters(value);
}

function toNodeParameters(value: object): INodeParameters {
	const result: INodeParameters = {};
	for (const [key, child] of Object.entries(value)) {
		if (!isSafeObjectProperty(key)) throw new Error(`Unsafe node parameter key: ${key}`);
		setSafeObjectProperty(result, key, toNodeParameterValue(child));
	}
	return result;
}

@Service()
export class JsonSchemaNodeMcpPocService {
	constructor(
		private readonly registry: NodeMcpPocRegistry,
		private readonly resolver: NodeToolResolverService,
		private readonly executor: NodeToolExecutorService,
	) {}

	async getServer(endpoint: string) {
		const toolset = this.registry.get(endpoint);
		if (!toolset) throw new Error(`Unknown node MCP POC endpoint: ${endpoint}`);
		const { McpServer } = await lazyImport<
			typeof import('@modelcontextprotocol/sdk/server/mcp.js')
		>(async () => await import('@modelcontextprotocol/sdk/server/mcp.js'));
		const server = new McpServer({
			name: `n8n Node MCP POC (${endpoint})`,
			version: '0.1.0',
		});

		for (const tool of toolset.tools) {
			server.registerTool(
				tool.name,
				{
					description: tool.description,
					inputSchema: tool.inputSchema,
					annotations: {
						title: tool.name,
						readOnlyHint: false,
						destructiveHint: tool.destructive,
						openWorldHint: true,
					},
				},
				async (argumentsValue) =>
					await toolResult(async () => {
						const result = await this.executor.execute(toolset, tool, argumentsValue);
						if (result.status === 'error') {
							throw new Error(result.error ?? 'Node execution failed');
						}
						return { items: result.data };
					}),
			);
		}

		this.registerResolvers(server, toolset);
		return server;
	}

	private registerResolvers(server: McpServer, toolset: CompiledNodeToolset) {
		switch (toolset.endpoint.flavor.resolver) {
			case 'per-parameter':
				this.registerPerParameterResolvers(server, toolset);
				break;
			case 'generic-single':
				this.registerGenericResolver(server, toolset);
				break;
			case 'generic-batch':
				this.registerBatchResolver(server, toolset);
				break;
		}
		if (toolset.endpoint.flavor.hideOptions) this.registerListOptions(server, toolset);
	}

	private registerPerParameterResolvers(server: McpServer, toolset: CompiledNodeToolset) {
		for (const tool of toolset.tools) {
			const descriptors = new Map(
				tool.dynamicParameters.map((descriptor) => [descriptor.path, descriptor]),
			);
			for (const [path, descriptor] of descriptors) {
				const name = `${tool.name}__resolve_${path.replaceAll(/[^a-zA-Z0-9_-]/g, '_')}`;
				const dependencyShape: z.ZodRawShape = {};
				const dependencyRoots = new Set<string>();
				for (const dependency of descriptor.dependencies) {
					const root = dependency.split('.')[0];
					dependencyRoots.add(root);
					dependencyShape[root] = (tool.inputFields[root] ?? z.unknown()).refine(
						(value) => value !== undefined,
						'Required',
					);
				}
				const inputSchema = z
					.object({
						...dependencyShape,
						filter: z.string().optional(),
						paginationToken: z.string().optional(),
					})
					.passthrough();
				server.registerTool(
					name,
					{
						description: `Resolve valid values or fields for ${tool.name}.${path}.${descriptor.dependencies.length > 0 ? ` Requires: ${descriptor.dependencies.join(', ')}.` : ''}`,
						inputSchema,
						annotations: {
							readOnlyHint: true,
							destructiveHint: false,
							idempotentHint: true,
							openWorldHint: true,
						},
					},
					async (input) => {
						const knownValues = Object.fromEntries(
							Array.from(dependencyRoots)
								.filter((root) => input[root] !== undefined)
								.map((root) => [root, input[root]]),
						);
						const filter = typeof input.filter === 'string' ? input.filter : undefined;
						const paginationToken =
							typeof input.paginationToken === 'string' ? input.paginationToken : undefined;
						return await toolResult(
							async () =>
								await this.resolver.resolve(
									toolset,
									tool,
									path,
									toNodeParameters(knownValues),
									filter,
									paginationToken,
								),
						);
					},
				);
			}
		}
	}

	private registerGenericResolver(server: McpServer, toolset: CompiledNodeToolset) {
		server.registerTool(
			'resolve_tool_parameter',
			{
				description:
					'Resolve one dynamic operation parameter. Use the operation tool name and a parameter path from its description.',
				inputSchema: {
					tool: z.string(),
					parameter: z.string(),
					knownValues: z.record(z.string(), z.unknown()).optional(),
					filter: z.string().optional(),
					paginationToken: z.string().optional(),
				},
				annotations: {
					readOnlyHint: true,
					destructiveHint: false,
					idempotentHint: true,
					openWorldHint: true,
				},
			},
			async ({ tool: toolName, parameter, knownValues = {}, filter, paginationToken }) => {
				return await toolResult(async () => {
					const tool = findTool(toolset, toolName);
					return await this.resolver.resolve(
						toolset,
						tool,
						parameter,
						toNodeParameters(knownValues),
						filter,
						paginationToken,
					);
				});
			},
		);
	}

	private registerBatchResolver(server: McpServer, toolset: CompiledNodeToolset) {
		server.registerTool(
			'resolve_tool_parameters',
			{
				description:
					'Resolve all currently unblocked dynamic parameters in dependency order, stopping when a choice is required.',
				inputSchema: {
					tool: z.string(),
					knownValues: z.record(z.string(), z.unknown()).optional(),
					queries: z.record(z.string(), z.string()).optional(),
				},
				annotations: {
					readOnlyHint: true,
					destructiveHint: false,
					idempotentHint: true,
					openWorldHint: true,
				},
			},
			async ({ tool: toolName, knownValues = {}, queries = {} }) => {
				return await toolResult(async () => {
					const tool = findTool(toolset, toolName);
					return await this.resolver.resolveBatch(
						toolset,
						tool,
						toNodeParameters(knownValues),
						queries,
					);
				});
			},
		);
	}

	private registerListOptions(server: McpServer, toolset: CompiledNodeToolset) {
		server.registerTool(
			'list_options',
			{
				description:
					'List fields hidden from an operation Options or Additional Fields collection. Values can then be passed in the open parent object.',
				inputSchema: {
					tool: z.string(),
					path: z.string().optional(),
				},
				annotations: {
					readOnlyHint: true,
					destructiveHint: false,
					idempotentHint: true,
					openWorldHint: false,
				},
			},
			async ({ tool: toolName, path }) => {
				return await toolResult(async () => {
					const tool: CompiledOperationTool = findTool(toolset, toolName);
					const options = path
						? tool.deferredOptions.filter((candidate) => candidate.path === path)
						: tool.deferredOptions;
					if (path && options.length === 0) {
						throw new Error(`No deferred options found for ${toolName}.${path}`);
					}
					return {
						tool: toolName,
						options: options.map((option) => ({
							path: option.path,
							displayName: option.displayName,
							schema: option.jsonSchema,
						})),
					};
				});
			},
		);
	}
}
