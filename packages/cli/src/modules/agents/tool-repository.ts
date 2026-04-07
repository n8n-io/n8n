import type { BuiltTool } from '@n8n/agents';
import { Tool } from '@n8n/agents';
import { Service } from '@n8n/di';
import type { INodeTypeDescription, INodeParameters } from 'n8n-workflow';
import { z } from 'zod';

import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { EphemeralNodeExecutor } from '@/node-execution';

// ---------------------------------------------------------------------------
// Public contracts
// ---------------------------------------------------------------------------

export interface ToolDescriptor {
	name: string;
	description: string;
}

export interface ToolRepository {
	listTools(): Promise<ToolDescriptor[]>;
	getTool(name: string): Promise<BuiltTool | undefined>;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function resolveLatestVersion(version: number | number[]): number {
	return Array.isArray(version) ? Math.max(...version) : version;
}

/**
 * Derives a lightweight Zod input schema from a node description.
 *
 * Extracts `resource` and `operation` as optional enum fields (giving the LLM
 * valid option values to choose from), then adds a passthrough `parameters`
 * catch-all for everything else.
 */
function buildInputSchema(nodeDesc: INodeTypeDescription): z.ZodObject<z.ZodRawShape> {
	const shape: z.ZodRawShape = {};

	const resourceProp = nodeDesc.properties.find((p) => p.name === 'resource');
	if (resourceProp?.options) {
		const values = (resourceProp.options as Array<{ value: unknown }>)
			.map((o) => o.value)
			.filter((v): v is string => typeof v === 'string');

		shape.resource = (
			values.length >= 2
				? z.enum(values as [string, ...string[]]).optional()
				: z.string().optional()
		).describe('The resource to operate on.');
	}

	const operationProp = nodeDesc.properties.find((p) => p.name === 'operation');
	if (operationProp?.options) {
		const values = (operationProp.options as Array<{ value: unknown }>)
			.map((o) => o.value)
			.filter((v): v is string => typeof v === 'string');

		shape.operation = (
			values.length >= 2
				? z.enum(values as [string, ...string[]]).optional()
				: z.string().optional()
		).describe('The operation to perform on the resource.');
	}

	shape.parameters = z
		.record(z.string(), z.unknown())
		.optional()
		.describe(
			'Additional node parameters (e.g. channel, message text, recipient). ' +
				'Keys and values depend on the selected resource and operation.',
		);

	return z.object(shape);
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * A {@link ToolRepository} backed by n8n's node registry.
 *
 * Lists all nodes marked `usableAsTool` and produces executable {@link BuiltTool}
 * instances on demand via {@link EphemeralNodeExecutor}.
 */
@Service()
export class NodeToolRepository implements ToolRepository {
	constructor(
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
		private readonly executor: EphemeralNodeExecutor,
	) {}

	async listTools(): Promise<ToolDescriptor[]> {
		const types = await this.loadNodesAndCredentials.collectTypes();

		return types.nodes
			.filter((n): n is INodeTypeDescription => Boolean(n.usableAsTool))
			.map((n) => ({ name: n.name, description: n.description }));
	}

	async getTool(name: string): Promise<BuiltTool | undefined> {
		const types = await this.loadNodesAndCredentials.collectTypes();
		const nodeDesc = types.nodes.find((n) => n.name === name && Boolean(n.usableAsTool));

		if (!nodeDesc) return undefined;

		const version = resolveLatestVersion(nodeDesc.version);
		const inputSchema = buildInputSchema(nodeDesc);

		return new Tool(name)
			.description(nodeDesc.description)
			.input(inputSchema)
			.handler(async (input: Record<string, unknown>) => {
				const { parameters, ...topLevelParams } = input as {
					resource?: string;
					operation?: string;
					parameters?: Record<string, unknown>;
				};

				const nodeParameters: INodeParameters = {
					...topLevelParams,
					...(parameters ?? {}),
				};

				return await this.executor.executeInline({
					nodeType: name,
					nodeTypeVersion: version,
					nodeParameters,
					inputData: [{ json: nodeParameters }],
					projectId: '',
				});
			})
			.build();
	}
}
