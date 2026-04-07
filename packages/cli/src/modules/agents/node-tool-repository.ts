import type { ToolDescriptor, ToolRepository } from '@n8n/agents';
import { Tool } from '@n8n/agents';
import type { BuiltTool } from '@n8n/agents';
import type { INodeTypeDescription, INodeParameters } from 'n8n-workflow';
import { z } from 'zod';

import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { EphemeralNodeExecutor } from '@/node-execution';

/**
 * Resolves the latest version number from a node description.
 * `version` may be a single number or an array; we always want the highest.
 */
function resolveLatestVersion(version: number | number[]): number {
	return Array.isArray(version) ? Math.max(...version) : version;
}

/**
 * Build an optional enum schema from a list of option values.
 * Falls back to z.string().optional() if no options are present.
 */
function buildEnumField(
	options: Array<{ value: unknown }> | undefined,
): z.ZodOptional<z.ZodString> | z.ZodOptional<z.ZodEnum<[string, ...string[]]>> {
	const values = (options ?? [])
		.map((o) => o.value)
		.filter((v): v is string => typeof v === 'string');

	if (values.length >= 2) {
		return z.enum(values as [string, ...string[]]).optional();
	}

	return z.string().optional();
}

/**
 * Derives a lightweight Zod input schema from a node description.
 *
 * Extracts `resource` and `operation` as optional enum fields (giving the LLM
 * valid option values to choose from), then adds a passthrough `parameters`
 * catch-all for everything else. This is intentionally minimal — the agent
 * reads the node description to understand what to pass.
 */
function buildInputSchema(nodeDesc: INodeTypeDescription): z.ZodObject<z.ZodRawShape> {
	const shape: z.ZodRawShape = {};

	const resourceProp = nodeDesc.properties.find((p) => p.name === 'resource');
	if (resourceProp?.options) {
		shape.resource = buildEnumField(resourceProp.options as Array<{ value: unknown }>).describe(
			'The resource to operate on.',
		);
	}

	const operationProp = nodeDesc.properties.find((p) => p.name === 'operation');
	if (operationProp?.options) {
		shape.operation = buildEnumField(operationProp.options as Array<{ value: unknown }>).describe(
			'The operation to perform on the resource.',
		);
	}

	// Passthrough catch-all for all other node parameters the agent wants to set.
	shape.parameters = z
		.record(z.string(), z.unknown())
		.optional()
		.describe(
			'Additional node parameters (e.g. channel, message text, recipient). ' +
				'Keys and values depend on the selected resource and operation.',
		);

	return z.object(shape);
}

/**
 * A {@link ToolRepository} backed by n8n's node registry.
 *
 * Lists all nodes marked `usableAsTool` and produces executable {@link BuiltTool}
 * instances on demand via {@link EphemeralNodeExecutor}.
 *
 * Credential filtering is intentionally skipped in this initial version —
 * all `usableAsTool` nodes are surfaced regardless of credential state.
 */
export class NodeToolRepository implements ToolRepository {
	constructor(
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
		private readonly executor: EphemeralNodeExecutor,
		private readonly projectId: string,
	) {}

	async listTools(): Promise<ToolDescriptor[]> {
		const types = await this.loadNodesAndCredentials.collectTypes();

		return types.nodes
			.filter((n): n is INodeTypeDescription => Boolean(n.usableAsTool))
			.map((n) => ({
				name: n.name,
				description: n.description,
				hasCredentials: true,
			}));
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
					projectId: this.projectId,
				});
			})
			.build();
	}
}
