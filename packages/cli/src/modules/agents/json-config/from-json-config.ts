import type {
	AgentBuilder,
	BuiltMemory,
	BuiltTool,
	CredentialProvider,
	ModelConfig,
	ToolDescriptor,
	JSONObject,
	RuntimeSkill,
	Agent as RuntimeAgent,
} from '@n8n/agents';
import { wrapToolForApproval } from '@n8n/agents/tool';
import type {
	AgentSkill,
	AgentJsonConfig,
	AgentJsonMemoryConfig,
	AgentJsonToolConfig,
	AgentJsonSkillConfig,
} from '@n8n/api-types';

import { mapCredentialForProvider } from './credential-field-mapping';
import { resolveProviderToolName } from './provider-tool-aliases';

export type ToolResolver = (
	toolSchema: AgentJsonToolConfig,
) => Promise<BuiltTool | null | undefined>;

export interface ToolExecutor {
	executeTool(toolName: string, input: unknown, ctx: unknown): Promise<unknown>;
	executeToMessageSync?(toolName: string, output: unknown): unknown;
}

/** Factory function that reconstructs a BuiltMemory backend from serialized params. */
export type MemoryFactory = (params: AgentJsonMemoryConfig) => BuiltMemory | Promise<BuiltMemory>;

type MemoryWorkerModelConfig = {
	model: string;
	credential: string;
};

export interface BuildFromJsonOptions {
	/** Executes custom tool handlers inside isolates. */
	toolExecutor: ToolExecutor;
	credentialProvider: CredentialProvider;
	/** Resolves workflow/node tool refs into BuiltTool instances. */
	resolveTool?: ToolResolver;
	/** Stored skill bodies keyed by skill id. Only refs present in config.skills are attached. */
	skills?: Record<string, AgentSkill>;
	/** Memory backend factories keyed by storage preset name. */
	memoryFactory: MemoryFactory;
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
): Promise<RuntimeAgent> {
	const { Agent } = await import('@n8n/agents');
	const agent = new Agent(config.name);

	const resolvedModelConfig = await resolveModelConfig(config, options.credentialProvider);
	agent.model(resolvedModelConfig);

	const configuredSkills = getConfiguredSkills(config.skills ?? [], options.skills ?? {});
	agent.instructions(config.instructions);

	// Tools
	if (config.tools) {
		for (const ref of config.tools) {
			const built = await resolveToolRef(ref, toolDescriptors, options);
			if (built) {
				agent.tool(built);
			}
		}
	}
	agent.skills(configuredSkills);

	// Provider tools
	if (config.providerTools) {
		for (const [name, args] of Object.entries(config.providerTools)) {
			const resolved = resolveProviderToolName(name);
			agent.providerTool({ name: resolved as `${string}.${string}`, args });
		}
	}

	// Memory
	if (config.memory?.enabled) {
		await applyMemoryFromConfig(
			agent,
			config.memory,
			options.memoryFactory,
			options.credentialProvider,
		);
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
		if (config.config.maxIterations) {
			agent.configuration({ maxIterations: config.config.maxIterations });
		}
	}

	return agent;
}

function getConfiguredSkills(
	refs: AgentJsonSkillConfig[],
	skills: Record<string, AgentSkill>,
): RuntimeSkill[] {
	const seen = new Set<string>();
	const configured: RuntimeSkill[] = [];

	for (const ref of refs) {
		if (seen.has(ref.id)) continue;
		seen.add(ref.id);
		const skill = skills[ref.id];
		if (!skill) throw new Error(`Skill "${ref.id}" not found in stored skill bodies`);
		configured.push({
			id: ref.id,
			name: skill.name,
			description: skill.description,
			instructions: skill.instructions,
		});
	}

	return configured;
}

async function resolveToolRef(
	ref: AgentJsonToolConfig,
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
				systemInstruction: descriptor.systemInstruction ?? undefined,
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
			const tool = (await options.resolveTool?.(ref)) ?? marker;
			if (ref.requireApproval) {
				return wrapToolForApproval(tool, { requireApproval: true });
			}
			return tool;
		}

		case 'node': {
			const marker: BuiltTool = {
				name: ref.name,
				description: ref.description ?? `Execute node ${ref.name}`,
				editable: false,
				metadata: { nodeTool: true, ...ref.node },
			};
			const tool = (await options.resolveTool?.(ref)) ?? marker;
			if (ref.requireApproval) {
				return wrapToolForApproval(tool, { requireApproval: true });
			}
			return tool;
		}
	}
}

async function applyMemoryFromConfig(
	agent: AgentBuilder,
	memoryConfig: AgentJsonMemoryConfig,
	memoryFactory: MemoryFactory,
	credentialProvider: CredentialProvider,
) {
	const { Memory } = await import('@n8n/agents');
	const memory = new Memory();

	const builtMemory = memoryFactory(memoryConfig);
	memory.storage(await Promise.resolve(builtMemory));

	if (memoryConfig.lastMessages) {
		memory.lastMessages(memoryConfig.lastMessages);
	}

	if (memoryConfig.semanticRecall) {
		memory.semanticRecall(memoryConfig.semanticRecall);
	}

	if (memoryConfig.episodicMemory?.enabled === true) {
		memory.episodicMemory(
			await resolveEpisodicMemoryJsonConfig(memoryConfig.episodicMemory, credentialProvider),
		);
	}

	if (memoryConfig.observationalMemory?.enabled !== false) {
		const observationalMemory = memoryConfig.observationalMemory;

		const { createObservationLogObserveFn, createObservationLogReflectFn } = await import(
			'@n8n/agents'
		);

		memory.observationalMemory({
			...(observationalMemory?.observerModel !== undefined && {
				observe: createObservationLogObserveFn(
					await resolveMemoryWorkerModelConfig(
						observationalMemory.observerModel,
						credentialProvider,
					),
				),
			}),
			...(observationalMemory?.reflectorModel !== undefined && {
				reflect: createObservationLogReflectFn(
					await resolveMemoryWorkerModelConfig(
						observationalMemory.reflectorModel,
						credentialProvider,
					),
				),
			}),
			...(observationalMemory?.observerThresholdTokens !== undefined && {
				observerThresholdTokens: observationalMemory.observerThresholdTokens,
			}),
			...(observationalMemory?.reflectorThresholdTokens !== undefined && {
				reflectorThresholdTokens: observationalMemory.reflectorThresholdTokens,
			}),
			...(observationalMemory?.renderTokenBudget !== undefined && {
				renderTokenBudget: observationalMemory.renderTokenBudget,
			}),
			...(observationalMemory?.observationLogTailLimit !== undefined && {
				observationLogTailLimit: observationalMemory.observationLogTailLimit,
			}),
			...(observationalMemory?.lockTtlMs !== undefined && {
				lockTtlMs: observationalMemory.lockTtlMs,
			}),
		});
	}

	memory.titleGeneration({ sync: true });

	agent.memory(memory);
}

async function resolveEpisodicMemoryJsonConfig(
	config: Extract<NonNullable<AgentJsonMemoryConfig['episodicMemory']>, { enabled: true }>,
	credentialProvider: CredentialProvider,
) {
	const {
		DEFAULT_EPISODIC_MEMORY_EMBEDDING_MODEL,
		createEpisodicMemoryExtractFn,
		createEpisodicMemoryReflectFn,
	} = await import('@n8n/agents');
	const embeddingModel = DEFAULT_EPISODIC_MEMORY_EMBEDDING_MODEL;
	const raw = await credentialProvider.resolve(config.credential);
	const mapped = mapCredentialForProvider(getProviderPrefix(embeddingModel), raw);
	const embeddingProviderOptions = {
		...(typeof mapped.apiKey === 'string' && { apiKey: mapped.apiKey }),
		...(typeof mapped.baseURL === 'string' && { baseURL: mapped.baseURL }),
	};

	return {
		enabled: true,
		...(config.extractorModel !== undefined && {
			extract: createEpisodicMemoryExtractFn(
				await resolveMemoryWorkerModelConfig(config.extractorModel, credentialProvider),
			),
		}),
		...(config.reflectorModel !== undefined && {
			reflect: createEpisodicMemoryReflectFn(
				await resolveMemoryWorkerModelConfig(config.reflectorModel, credentialProvider),
			),
		}),
		...(config.topK !== undefined && { topK: config.topK }),
		...(config.maxEntriesPerRun !== undefined && { maxEntriesPerRun: config.maxEntriesPerRun }),
		embeddingProviderOptions,
	};
}

async function resolveModelConfig(
	config: AgentJsonConfig,
	credentialProvider: CredentialProvider,
): Promise<ModelConfig> {
	if (!config.credential) return config.model;

	return await resolveCredentialAwareModelConfig(
		config.model,
		config.credential,
		credentialProvider,
	);
}

async function resolveMemoryWorkerModelConfig(
	config: MemoryWorkerModelConfig,
	credentialProvider: CredentialProvider,
): Promise<ModelConfig> {
	return await resolveCredentialAwareModelConfig(
		config.model,
		config.credential,
		credentialProvider,
	);
}

async function resolveCredentialAwareModelConfig(
	model: string,
	credential: string,
	credentialProvider: CredentialProvider,
): Promise<ModelConfig> {
	const raw = await credentialProvider.resolve(credential);
	const mapped = mapCredentialForProvider(getProviderPrefix(model), raw);
	return { id: model, ...mapped } as ModelConfig;
}

function getProviderPrefix(modelId: string): string {
	const slashIdx = modelId.indexOf('/');
	return slashIdx !== -1 ? modelId.slice(0, slashIdx) : '';
}
