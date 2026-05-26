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
import { z } from 'zod';

import { mapCredentialForProvider } from './credential-field-mapping';
import {
	getNativeWebSearchProviderTools,
	hasNativeWebSearchProvider,
	isNativeWebSearchRequested,
} from './native-web-search-provider-tools';
import { resolveProviderToolName } from './provider-tool-aliases';

const WEB_SEARCH_TOOL_NAME = 'web_search';
const WEB_SEARCH_INPUT_SCHEMA = z.object({
	query: z.string().min(1).describe('Search query'),
	maxResults: z.number().int().min(1).max(10).optional().describe('Maximum number of results'),
	includeDomains: z.array(z.string()).optional().describe('Only return results from these domains'),
	excludeDomains: z.array(z.string()).optional().describe('Exclude results from these domains'),
});

export type ToolResolver = (
	toolSchema: AgentJsonToolConfig,
) => Promise<BuiltTool | null | undefined>;

export interface ToolExecutor {
	executeTool(toolName: string, input: unknown, ctx: unknown): Promise<unknown>;
	executeToMessageSync?(toolName: string, output: unknown): unknown;
}

/** Factory function that reconstructs a BuiltMemory backend from serialized params. */
export type MemoryFactory = (params: AgentJsonMemoryConfig) => BuiltMemory | Promise<BuiltMemory>;

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
	const providerTools = getNativeWebSearchProviderTools(config, { includeDefaultArgs: false });
	if (providerTools) {
		for (const [name, args] of Object.entries(providerTools)) {
			const resolved = resolveProviderToolName(name);
			agent.providerTool({ name: resolved as `${string}.${string}`, args });
		}
	}
	const fallbackWebSearchTool = buildFallbackWebSearchTool(config, options.credentialProvider);
	if (fallbackWebSearchTool) {
		agent.tool(fallbackWebSearchTool);
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

function buildFallbackWebSearchTool(
	config: AgentJsonConfig,
	credentialProvider: CredentialProvider,
): BuiltTool | null {
	const webSearchConfig = config.config?.webSearch;

	if (!webSearchConfig?.enabled) return null;
	if (isNativeWebSearchRequested(config) && hasNativeWebSearchProvider(config.model)) return null;
	if (webSearchConfig.provider !== 'brave' && webSearchConfig.provider !== 'searxng') {
		throw new Error('Web search is enabled but no fallback search provider is configured.');
	}
	if (!webSearchConfig.credential) {
		throw new Error('Web search is enabled but no search credential is configured.');
	}
	const credentialId = webSearchConfig.credential;

	return {
		name: WEB_SEARCH_TOOL_NAME,
		description: 'Search the web for current information.',
		systemInstruction:
			'Before using web_search, choose the smallest search plan that can answer the user. Start with one broad, high-signal query. After seeing results, decide whether a narrower follow-up is necessary. Do not launch multiple searches in parallel unless the user asked for deep research or comparison across independent topics.',
		inputSchema: WEB_SEARCH_INPUT_SCHEMA,
		handler: async (input) => {
			const args = WEB_SEARCH_INPUT_SCHEMA.parse(input);
			const credential = await credentialProvider.resolve(credentialId);
			const { braveSearch, searxngSearch } = await import('@n8n/ai-utilities');

			if (webSearchConfig.provider === 'brave') {
				if (typeof credential.apiKey !== 'string') {
					throw new Error('Brave Search credential is missing an API key.');
				}
				return await braveSearch(credential.apiKey, args.query, {
					maxResults: args.maxResults,
					includeDomains: args.includeDomains,
					excludeDomains: args.excludeDomains,
				});
			}

			if (typeof credential.apiUrl !== 'string') {
				throw new Error('SearXNG credential is missing an API URL.');
			}
			return await searxngSearch(credential.apiUrl, args.query, {
				maxResults: args.maxResults,
				includeDomains: args.includeDomains,
				excludeDomains: args.excludeDomains,
			});
		},
	};
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

		memory.observationalMemory({
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
	const { DEFAULT_EPISODIC_MEMORY_EMBEDDING_MODEL } = await import('@n8n/agents');
	const embeddingModel = DEFAULT_EPISODIC_MEMORY_EMBEDDING_MODEL;
	const raw = await credentialProvider.resolve(config.credential);
	const mapped = mapCredentialForProvider(getProviderPrefix(embeddingModel), raw);
	const embeddingProviderOptions = {
		...(typeof mapped.apiKey === 'string' && { apiKey: mapped.apiKey }),
		...(typeof mapped.baseURL === 'string' && { baseURL: mapped.baseURL }),
	};

	return {
		enabled: true,
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

	const slashIdx = config.model.indexOf('/');
	const providerPrefix = slashIdx !== -1 ? config.model.slice(0, slashIdx) : '';
	const raw = await credentialProvider.resolve(config.credential);
	const mapped = mapCredentialForProvider(providerPrefix, raw);
	return { id: config.model, ...mapped } as ModelConfig;
}

function getProviderPrefix(modelId: string): string {
	const slashIdx = modelId.indexOf('/');
	return slashIdx !== -1 ? modelId.slice(0, slashIdx) : '';
}
