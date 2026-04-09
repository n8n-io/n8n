import type {
	AgentBuilder,
	BuiltMemory,
	BuiltTool,
	CredentialProvider,
	ToolDescriptor,
	JSONObject,
} from '@n8n/agents';
import { Agent, Memory, wrapToolForApproval } from '@n8n/agents';

import type { AgentJsonConfig, AgentJsonToolRef } from './agent-json-config';

export interface ToolExecutor {
	executeTool(toolName: string, input: unknown, ctx: unknown): Promise<unknown>;
	executeToMessageSync?(toolName: string, output: unknown): unknown;
}

export type ToolRefResolver = (ref: AgentJsonToolRef) => Promise<BuiltTool | null | undefined>;

/** Factory function that reconstructs a BuiltMemory backend from serialized params. */
type MemoryFactory = (params: Record<string, unknown> | null) => BuiltMemory | Promise<BuiltMemory>;

export interface BuildFromJsonOptions {
	/** Executes custom tool handlers inside isolates. */
	toolExecutor: ToolExecutor;
	credentialProvider?: CredentialProvider;
	/** Resolves workflow/node tool refs into BuiltTool instances. */
	resolveTool?: ToolRefResolver;
	/** Memory backend factories keyed by storage preset name. */
	memoryRegistry?: Record<string, MemoryFactory>;
}

/**
 * Build a live Agent from an AgentJsonConfig + tool descriptors.
 *
 * This is the JSON-config execution path — lighter than fromSchema() because
 * there are no source strings to evaluate. Custom tool handlers are dispatched
 * individually per tool-id via the ToolExecutor.
 */
export async function buildFromJson(
	config: AgentJsonConfig,
	toolDescriptors: Record<string, ToolDescriptor>,
	options: BuildFromJsonOptions,
): Promise<Agent> {
	const agent = new Agent(config.name);

	// Model: "provider/model-name" format
	const slashIdx = config.model.indexOf('/');
	if (slashIdx !== -1) {
		agent.model(config.model.slice(0, slashIdx), config.model.slice(slashIdx + 1));
	} else {
		agent.model(config.model);
	}

	agent.credential(config.credential);
	agent.instructions(config.instructions);

	if (options.credentialProvider) {
		agent.credentialProvider(options.credentialProvider);
	}

	// Tools
	if (config.tools) {
		for (const ref of config.tools) {
			const built = await resolveToolRef(ref, toolDescriptors, options);
			if (built) {
				agent.tool(built);
			}
		}
	}

	// Provider tools
	if (config.providerTools) {
		for (const [name, args] of Object.entries(config.providerTools)) {
			agent.providerTool({ name: name as `${string}.${string}`, args });
		}
	}

	// Memory
	if (config.memory?.enabled) {
		applyMemoryFromConfig(agent, config.memory, options.memoryRegistry);
	}

	// Config options
	if (config.config) {
		if (config.config.thinking) {
			const { provider, ...rest } = config.config.thinking;
			agent.thinking(provider, rest);
		}
		if (config.config.toolCallConcurrency) {
			agent.toolCallConcurrency(config.config.toolCallConcurrency);
		}
		if (config.config.requireToolApproval) {
			agent.requireToolApproval();
		}
	}

	return agent;
}

async function resolveToolRef(
	ref: AgentJsonToolRef,
	descriptors: Record<string, ToolDescriptor>,
	options: BuildFromJsonOptions,
): Promise<BuiltTool | null> {
	switch (ref.type) {
		case 'custom': {
			const descriptor = descriptors[ref.id];
			if (!descriptor) {
				throw new Error(`Custom tool "${ref.id}" not found in tool descriptors`);
			}

			const builtTool: BuiltTool = {
				name: descriptor.name,
				description: descriptor.description,
				inputSchema: descriptor.inputSchema ?? undefined,
				handler: async (input, ctx) => {
					return await options.toolExecutor.executeTool(descriptor.name, input, {
						resumeData: 'resumeData' in ctx ? ctx.resumeData : undefined,
						parentTelemetry: ctx.parentTelemetry,
					});
				},
				providerOptions: descriptor.providerOptions as Record<string, JSONObject> | undefined,
			};

			if (ref.requireApproval) {
				return wrapToolForApproval(builtTool, { requireApproval: true });
			}
			return builtTool;
		}

		case 'workflow': {
			const marker: BuiltTool = {
				name: ref.name ?? ref.workflow,
				description: ref.description ?? `Execute the "${ref.workflow}" workflow`,
				editable: false,
				metadata: {
					workflowTool: true,
					workflowName: ref.workflow,
					options: { name: ref.name, description: ref.description },
				},
			};
			const resolved = await options.resolveTool?.(ref);
			return resolved ?? marker;
		}

		case 'node': {
			const marker: BuiltTool = {
				name: ref.name,
				description: ref.description ?? `Execute node ${ref.name}`,
				editable: false,
				metadata: { nodeTool: true, ...ref.node },
			};
			const resolved = await options.resolveTool?.(ref);
			return resolved ?? marker;
		}
	}
}

function applyMemoryFromConfig(
	agent: AgentBuilder,
	memoryConfig: NonNullable<AgentJsonConfig['memory']>,
	memoryRegistry?: Record<string, MemoryFactory>,
): void {
	const memory = new Memory();

	if (memoryRegistry) {
		const factory = memoryRegistry[memoryConfig.storage] as MemoryFactory | undefined;
		if (factory) {
			const connectionParams = (memoryConfig.connection ?? null) as Record<string, unknown> | null;
			const builtMemory = factory(connectionParams);
			if (!(builtMemory instanceof Promise)) {
				memory.storage(builtMemory);
			}
		}
	}

	if (memoryConfig.lastMessages) {
		memory.lastMessages(memoryConfig.lastMessages);
	}

	if (memoryConfig.semanticRecall) {
		memory.semanticRecall(memoryConfig.semanticRecall);
	}

	agent.memory(memory);
}
