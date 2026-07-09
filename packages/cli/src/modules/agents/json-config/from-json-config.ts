import type {
	AgentBuilder,
	BuiltMemory,
	BuiltProviderTool,
	BuiltTool,
	CredentialProvider,
	FetchFn,
	McpClient,
	ModelConfig,
	ToolDescriptor,
	JSONObject,
	RuntimeSkill,
	RuntimeSkillLinkedFiles,
	RuntimeSkillSource,
	Agent as RuntimeAgent,
} from '@n8n/agents';
import { wrapToolForApproval } from '@n8n/agents/tool';
import {
	getNativeWebSearchProviderTools,
	getProviderPrefix,
	hasNativeWebSearchProvider,
	isNativeWebSearchRequested,
} from '@n8n/ai-utilities/agent-config';
import type {
	AgentSkill,
	AgentJsonConfig,
	AgentJsonMcpServerConfig,
	AgentJsonMemoryConfig,
	AgentJsonToolConfig,
	AgentJsonSkillConfig,
} from '@n8n/api-types';
import { MANAGED_CREDENTIAL_TOKEN } from '@n8n/api-types';
import { createHash } from 'crypto';
import { z } from 'zod';

import {
	resolveEmbeddingProviderOptionsFromCredential,
	type ManagedEmbeddingProviderOptions,
	type ManagedEmbeddingProviderOptionsResolver,
} from './embedding-credential';
import { resolveCredentialAwareModelConfig } from './model-config';
import { resolveProviderToolName } from './provider-tool-aliases';
import { buildVectorStore } from './vector-store-factory';

export type { ManagedEmbeddingProviderOptions, ManagedEmbeddingProviderOptionsResolver };

const WEB_SEARCH_TOOL_NAME = 'web_search';
const WEB_SEARCH_INPUT_SCHEMA = z.object({
	query: z.string().min(1).describe('Search query'),
	maxResults: z.number().int().min(1).max(10).optional().describe('Maximum number of results'),
	includeDomains: z.array(z.string()).optional().describe('Only return results from these domains'),
	excludeDomains: z.array(z.string()).optional().describe('Exclude results from these domains'),
});

const WEB_SEARCH_POLICY_INSTRUCTION =
	'### Web search policy\n' +
	'Use web search only on high-signal requests: explicit web/current/latest/live/recent/research/source requests, or questions that require up-to-date external facts. Do not use web search for static knowledge, uploaded knowledge, local config, codebase questions, or confirmation. Prefer answering directly or using local knowledge tools first. One search is usually enough; do not search repeatedly unless the user asks for deep research.';

export type ToolResolver = (
	toolSchema: AgentJsonToolConfig,
) => Promise<BuiltTool | null | undefined>;

export interface ToolExecutor {
	executeTool(toolName: string, input: unknown, ctx: unknown): Promise<unknown>;
	executeToMessageSync?(toolName: string, output: unknown): unknown;
}

/** Factory function that reconstructs a BuiltMemory backend from serialized params. */
export type MemoryFactory = (params: AgentJsonMemoryConfig) => BuiltMemory | Promise<BuiltMemory>;

/**
 * Build an SDK `McpClient` from a single JSON-config MCP server entry. The
 * platform layer owns this factory because it needs access to the credential
 * store and OAuth2 refresh infrastructure, both of which are out of scope for
 * `buildFromJson`.
 */
export type McpClientBuilder = (server: AgentJsonMcpServerConfig) => Promise<McpClient>;

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
	/**
	 * When provided, each entry in `config.mcpServers` is built into an
	 * `McpClient` and attached to the agent via `agent.mcp(client)`. The
	 * platform layer is responsible for tracking returned clients for
	 * teardown when the runtime is evicted.
	 *
	 */
	buildMcpClient?: McpClientBuilder;
	/** Resolves proxy-backed OpenAI embedding options for `credential: "managed"`. */
	resolveManagedEmbeddingProviderOptions?: ManagedEmbeddingProviderOptionsResolver;
	/** Proxy-aware `fetch` for the agent's model calls (see `createAiProxyFetch`). */
	modelFetch?: FetchFn;
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
	const { Agent, createRuntimeSkillRegistry } = await import('@n8n/agents');
	const agent = new Agent(config.name);

	const resolvedModelConfig = await resolveModelConfig(config, options.credentialProvider);
	agent.model(resolvedModelConfig);
	if (options.modelFetch) {
		agent.modelFetch(options.modelFetch);
	}

	const configuredSkillSource = getConfiguredSkillSource(
		config.skills ?? [],
		options.skills ?? {},
		createRuntimeSkillRegistry,
	);
	agent.instructions(getInstructionsWithWebSearchPolicy(config));

	// Tools
	if (config.tools) {
		for (const ref of config.tools) {
			const built = await resolveToolRef(ref, toolDescriptors, options);
			if (built) {
				agent.tool(built);
			}
		}
	}

	if (config.mcpServers?.length && options.buildMcpClient) {
		for (const server of config.mcpServers) {
			const client = await options.buildMcpClient(server);
			agent.mcp(client);
		}
	}

	if (config.vectorStores?.length) {
		for (const vectorStoreConfig of config.vectorStores) {
			// Draft connections may not have a credential (or embedding credential)
			// selected yet — skip them rather than failing the whole agent build.
			if (!vectorStoreConfig.credential || !vectorStoreConfig.embedding.credential) continue;
			const vectorStore = await buildVectorStore(vectorStoreConfig, options.credentialProvider);
			agent.vectorStore(vectorStore, { description: vectorStoreConfig.useWhen });
		}
	}

	agent.skills(configuredSkillSource);

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
			options.resolveManagedEmbeddingProviderOptions,
		);
	}

	// Config options
	if (config.config) {
		if (config.config.thinking) {
			const { provider, ...rest } = config.config.thinking;
			agent.thinking(provider, rest);
		}
		if (config.config.promptCaching) {
			agent.promptCaching(config.config.promptCaching);
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

function modelConfigToModelId(modelConfig: ModelConfig): string | undefined {
	if (typeof modelConfig === 'string') return modelConfig;
	if (typeof modelConfig === 'object' && modelConfig !== null && 'id' in modelConfig) {
		return typeof modelConfig.id === 'string' ? modelConfig.id : undefined;
	}
	if (
		typeof modelConfig === 'object' &&
		modelConfig !== null &&
		'provider' in modelConfig &&
		'modelId' in modelConfig
	) {
		const provider = typeof modelConfig.provider === 'string' ? modelConfig.provider : undefined;
		const modelId = typeof modelConfig.modelId === 'string' ? modelConfig.modelId : undefined;
		return provider && modelId ? `${provider}/${modelId}` : undefined;
	}
	return undefined;
}

function getProviderToolPrefix(toolName: string): string | undefined {
	const dotIndex = toolName.indexOf('.');
	return dotIndex > 0 ? toolName.slice(0, dotIndex) : undefined;
}

function getInstructionsWithWebSearchPolicy(config: AgentJsonConfig): string {
	if (config.config?.webSearch?.enabled !== true) return config.instructions;
	return `${config.instructions.trimEnd()}\n\n${WEB_SEARCH_POLICY_INSTRUCTION}`;
}

/**
 * Build provider-defined tools for a specific model from persisted agent config.
 * Used for inline sub-agents whose effective model may differ from the parent model.
 */
export function buildProviderToolsForModel(
	config: AgentJsonConfig,
	modelConfig: ModelConfig,
): BuiltProviderTool[] {
	const modelId = modelConfigToModelId(modelConfig);
	if (!modelId) return [];

	const providerPrefix = getProviderPrefix(modelId);
	if (!providerPrefix) return [];

	const providerTools = getNativeWebSearchProviderTools(
		{ ...config, model: modelId },
		{ includeDefaultArgs: false },
	);

	return Object.entries(providerTools)
		.map(([name, args]) => ({
			name: resolveProviderToolName(name) as `${string}.${string}`,
			args,
		}))
		.filter((tool) => getProviderToolPrefix(tool.name) === providerPrefix);
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
			'Before using web_search, choose the smallest search plan that can answer the user. Default to one broad, high-signal query. After each search, stop if the results already contain enough credible sources to answer. Use a second search only when the first result set is insufficient or the user asked for comparison across independent source categories. Do not fan out variations of the same query, and do not search for confirmation only. Use more than two searches only when the user explicitly asks for deep research, exhaustive coverage, or multiple independent topics.',
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

function getConfiguredSkillSource(
	refs: AgentJsonSkillConfig[],
	skills: Record<string, AgentSkill>,
	createRegistry: (skills: RuntimeSkill[]) => RuntimeSkillSource['registry'],
): RuntimeSkillSource {
	const seen = new Set<string>();
	const configured: RuntimeSkill[] = [];
	const referencesBySkillId = new Map<
		string,
		Map<string, NonNullable<AgentSkill['references']>[number]>
	>();

	for (const ref of refs) {
		if (seen.has(ref.id)) continue;
		seen.add(ref.id);
		const skill = skills[ref.id];
		if (!skill) throw new Error(`Skill "${ref.id}" not found in stored skill bodies`);
		const linkedFiles = linkedFilesForSkill(skill);
		referencesBySkillId.set(
			ref.id,
			new Map((skill.references ?? []).map((reference) => [reference.path, reference])),
		);
		configured.push({
			id: ref.id,
			name: skill.name,
			description: skill.description,
			instructions: skill.instructions,
			...(skill.allowedTools ? { allowedTools: skill.allowedTools } : {}),
			linkedFiles,
		});
	}

	const skillsById = new Map(configured.map((skill) => [skill.id, skill]));
	return {
		registry: createRegistry(configured),
		loadSkill: async (skillId) => (await Promise.resolve(skillsById.get(skillId))) ?? null,
		loadFile: async (skillId, filePath) => {
			const reference = referencesBySkillId.get(skillId)?.get(filePath);
			if (!reference) return await Promise.resolve(null);
			return await Promise.resolve({
				skillId,
				filePath: reference.path,
				content: reference.content,
				bytes: Buffer.byteLength(reference.content, 'utf8'),
				sha256: createHash('sha256').update(reference.content).digest('hex'),
			});
		},
	};
}

function linkedFilesForSkill(skill: AgentSkill): RuntimeSkillLinkedFiles {
	return {
		references: (skill.references ?? []).map((reference) => ({
			path: reference.path,
			bytes: Buffer.byteLength(reference.content, 'utf8'),
			sha256: createHash('sha256').update(reference.content).digest('hex'),
		})),
		templates: [],
		scripts: [],
		assets: [],
		examples: [],
		other: [],
	};
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
	resolveManagedEmbeddingProviderOptions?: ManagedEmbeddingProviderOptionsResolver,
) {
	const { Memory } = await import('@n8n/agents');
	const memory = new Memory();

	const builtMemory = memoryFactory(memoryConfig);
	memory.storage(await Promise.resolve(builtMemory));

	if (memoryConfig.episodicMemory?.enabled === true) {
		memory.episodicMemory(
			await resolveEpisodicMemoryJsonConfig(
				memoryConfig.episodicMemory,
				credentialProvider,
				resolveManagedEmbeddingProviderOptions,
			),
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
	resolveManagedEmbeddingProviderOptions?: ManagedEmbeddingProviderOptionsResolver,
) {
	const {
		DEFAULT_EPISODIC_MEMORY_EMBEDDING_MODEL,
		createEpisodicMemoryExtractFn,
		createEpisodicMemoryReflectFn,
	} = await import('@n8n/agents');
	const embeddingModel = DEFAULT_EPISODIC_MEMORY_EMBEDDING_MODEL;
	const embeddingProviderOptions =
		config.credential === MANAGED_CREDENTIAL_TOKEN
			? await resolveManagedEmbeddingProviderOptions?.()
			: await resolveEmbeddingProviderOptionsFromCredential(
					config.credential,
					embeddingModel,
					credentialProvider,
				);

	if (!embeddingProviderOptions) {
		throw new Error('Managed Episodic Memory embeddings require the AI assistant proxy.');
	}

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
