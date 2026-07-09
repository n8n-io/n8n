import type { BuiltTool, CredentialProvider } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import {
	applyNativeWebSearchDefaultOn,
	getProviderPrefix,
	rejectIfDynamicSelectorUsesFromAi,
	rejectIfEmptyInstructions,
	rejectIfUnsupportedNativeWebSearch,
	type AgentConfigValidationMessages,
} from '@n8n/ai-utilities/agent-config';
import {
	agentSkillSchema,
	agentTaskSchema,
	formatZodErrors,
	PROVIDER_CAPABILITIES,
	resolvePromptCaching,
	RunnableAgentJsonConfigSchema,
	sanitizeAgentJsonConfig,
	tryParseConfigJson,
	type AgentSkill,
	type AgentJsonConfig,
	type ConfigValidationError,
} from '@n8n/api-types';
import { OutboundHttp, SsrfProtectionService } from '@n8n/backend-network';
import { SsrfProtectionConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import type { Operation } from 'fast-json-patch';
import { createHash } from 'node:crypto';
import { z } from 'zod';

import { CredentialTypes } from '@/credential-types';
import { McpRegistryService } from '@/modules/mcp-registry/registry/mcp-registry.service';
import { NodeTypes } from '@/node-types';
import { OauthService } from '@/oauth/oauth.service';
import { AiService } from '@/services/ai.service';
import { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';
import { createAiMcpFetch } from '@/utils/ai-proxy-fetch';

import { AgentConfigService } from '../agent-config.service';
import { AgentCustomToolsService } from '../agent-custom-tools.service';
import { AgentIntegrationPersistenceService } from '../agent-integration-persistence.service';
import { AgentSkillsService } from '../agent-skills.service';
import { AgentTaskService } from '../agent-task.service';
import { AgentsToolsService } from '../agents-tools.service';
import { AgentsService } from '../agents.service';
import { AttachableWorkflowsService } from '../attachable-workflows.service';
import { BuilderModelLiveLookupService } from './builder-model-live-lookup.service';
import { BUILDER_TOOLS } from './builder-tool-names';
import { buildGetResourceLocatorOptionsTool } from './get-resource-locator-options.tool';
import {
	buildAskCredentialTool,
	buildAskEmbeddingCredentialTool,
	buildAskLlmTool,
	buildAskQuestionTool,
	buildResolveLlmTool,
} from './interactive';
import type { ModelLookup } from './interactive/resolve-llm.tool';
import { buildSearchMcpServersTool } from './search-mcp-servers.tool';
import { SKILL_BODY_GUIDANCE, SKILL_DESCRIPTION_RULE } from './skill-body-template';
import { TASK_OBJECTIVE_GUIDANCE } from './task-objective-template';
import { buildVerifyMcpServerTool } from './verify-mcp-server.tool';
import { composeJsonConfig } from '../json-config/agent-config-composition';
import { AgentRepository } from '../repositories/agent.repository';
import { AgentSecureRuntime } from '../runtime/agent-secure-runtime';

const STALE_CONFIG_ERROR: ConfigValidationError = {
	path: '(root)',
	message:
		'Agent config changed since you last read it. Call read_config and retry with the returned configHash.',
};

/** LLM-facing follow-up guidance for this builder surface (CLI skill-based tools). */
const CLI_AGENT_CONFIG_MESSAGES: AgentConfigValidationMessages = {
	emptyInstructionsFollowUp: 'saving the config again.',
	dynamicSelectorFollowUp:
		'Load skill agent-builder-resource-locators, resolve a credential if missing, then call ' +
		'get_resource_locator_options and write the returned parameterValue into nodeParameters.',
};

const createSkillInputSchema = z
	.object({
		name: agentSkillSchema.shape.name.describe('Human-readable skill name'),
		description: agentSkillSchema.shape.description.describe(SKILL_DESCRIPTION_RULE),
		instructions: agentSkillSchema.shape.instructions.describe(SKILL_BODY_GUIDANCE),
		allowedTools: agentSkillSchema.shape.allowedTools
			.optional()
			.describe('Exact target-agent tool names this skill is allowed to use.'),
		references: agentSkillSchema.shape.references
			.optional()
			.describe(
				'Markdown-only supporting files under references/... paths. References are not automatically loaded; instructions must say exactly when to load each reference by path.',
			),
	})
	.strict();

type CreateSkillInput = z.infer<typeof createSkillInputSchema>;

export interface AgentConfigSnapshot {
	config: AgentJsonConfig | null;
	configHash: string | null;
	updatedAt: string | null;
	versionId: string | null;
}

function canonicalizeJson(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map((item) => canonicalizeJson(item));
	}

	if (!isRecord(value)) return value;

	const sorted: Record<string, unknown> = {};
	for (const key of Object.keys(value).sort()) {
		sorted[key] = canonicalizeJson(value[key]);
	}
	return sorted;
}

export function getAgentConfigHash(config: AgentJsonConfig | null): string | null {
	if (!config) return null;
	return createHash('sha256')
		.update(JSON.stringify(canonicalizeJson(config)))
		.digest('hex');
}

function snapshotFromConfig(
	config: AgentJsonConfig | null,
	updatedAt: string | null,
	versionId: string | null,
): AgentConfigSnapshot {
	return {
		config,
		configHash: getAgentConfigHash(config),
		updatedAt,
		versionId,
	};
}

/**
 * Prompt caching is mandatory for OpenAI/Anthropic: this write-path
 * normalizer guarantees `config.promptCaching` is force-enabled for those
 * providers (the user cannot disable it, even if the LLM wrote
 * `{ enabled: false }`), preserves an explicit Anthropic TTL, and strips the
 * field entirely for every other provider — regardless of what the builder
 * LLM wrote.
 */
function applyPromptCachingBuilderDefaults(config: AgentJsonConfig): AgentJsonConfig {
	const providerPrefix = getProviderPrefix(config.model);
	const capability = PROVIDER_CAPABILITIES[providerPrefix]?.promptCaching ?? false;
	const resolved = resolvePromptCaching(config.config?.promptCaching, capability);

	if (!resolved) {
		if (!config.config || !('promptCaching' in config.config)) return config;
		const { promptCaching: _promptCaching, ...restConfig } = config.config;
		const { config: _config, ...restAgentConfig } = config;
		return {
			...restAgentConfig,
			...(Object.keys(restConfig).length > 0 ? { config: restConfig } : {}),
		};
	}

	return {
		...config,
		config: {
			...(config.config ?? {}),
			promptCaching: resolved,
		},
	};
}
export interface BuilderTools {
	json: BuiltTool[];
	shared: BuiltTool[];
}

@Service()
export class AgentsBuilderToolsService {
	constructor(
		private readonly agentsService: AgentsService,
		private readonly agentConfigService: AgentConfigService,
		private readonly agentCustomToolsService: AgentCustomToolsService,
		private readonly agentIntegrationPersistenceService: AgentIntegrationPersistenceService,
		private readonly agentSkillsService: AgentSkillsService,
		private readonly secureRuntime: AgentSecureRuntime,
		private readonly attachableWorkflowsService: AttachableWorkflowsService,
		private readonly agentsToolsService: AgentsToolsService,
		private readonly builderModelLiveLookupService: BuilderModelLiveLookupService,
		private readonly mcpRegistryService: McpRegistryService,
		private readonly oauthService: OauthService,
		private readonly credentialTypes: CredentialTypes,
		private readonly agentTaskService: AgentTaskService,
		private readonly agentRepository: AgentRepository,
		private readonly aiService: AiService,
		private readonly outboundHttp: OutboundHttp,
		private readonly dynamicNodeParametersService: DynamicNodeParametersService,
		private readonly nodeTypes: NodeTypes,
		private readonly ssrfConfig: SsrfProtectionConfig,
		private readonly ssrfProtectionService: SsrfProtectionService,
	) {}

	getTools(
		agentId: string,
		projectId: string,
		credentialProvider: CredentialProvider,
		user: User,
	): BuilderTools {
		return {
			json: this.getJsonTools(agentId, projectId, credentialProvider, user),
			shared: this.getSharedTools(agentId, projectId, credentialProvider, user),
		};
	}

	private getJsonTools(
		agentId: string,
		projectId: string,
		credentialProvider: CredentialProvider,
		user: User,
	): BuiltTool[] {
		const readConfigTool = new Tool(BUILDER_TOOLS.READ_CONFIG)
			.description(
				'Read the latest persisted agent configuration and freshness metadata. ' +
					'Returns { ok: true, config, configHash, updatedAt, versionId }. ' +
					'Call this before every write_config or patch_config and use configHash as baseConfigHash.',
			)
			.input(z.object({}))
			.handler(async () => {
				try {
					return { ok: true, ...(await this.getConfigSnapshot(agentId, projectId)) };
				} catch (e) {
					return {
						ok: false,
						errors: [{ path: '(root)', message: e instanceof Error ? e.message : String(e) }],
					};
				}
			})
			.build();

		const writeConfigTool = new Tool(BUILDER_TOOLS.WRITE_CONFIG)
			.description(
				'Create or replace the agent configuration by writing a complete JSON string. ' +
					'Requires baseConfigHash from the immediately preceding read_config result, or from a stale retry response. ' +
					'Do not use a configHash copied from the prompt snapshot. ' +
					'Returns { ok: true, config, configHash, updatedAt, versionId } on success or ' +
					'{ ok: false, stage, errors } with path, message, expected, received fields on failure.',
			)
			.input(
				z.object({
					json: z.string().describe('Complete agent configuration as a JSON string'),
					baseConfigHash: z
						.string()
						.nullable()
						.describe(
							'configHash from the immediately preceding read_config result; null only if no config exists',
						),
				}),
			)
			.handler(
				async ({ json, baseConfigHash }: { json: string; baseConfigHash: string | null }) => {
					const parsed = tryParseConfigJson(json);
					if (!parsed.ok) {
						return { ok: false, errors: parsed.errors };
					}
					let snapshot: AgentConfigSnapshot;
					try {
						snapshot = await this.getConfigSnapshot(agentId, projectId);
					} catch (e) {
						return {
							ok: false,
							stage: 'stale',
							errors: [{ path: '(root)', message: e instanceof Error ? e.message : String(e) }],
						};
					}
					if (baseConfigHash !== snapshot.configHash) {
						return { ok: false, stage: 'stale', errors: [STALE_CONFIG_ERROR], ...snapshot };
					}
					const zodResult = RunnableAgentJsonConfigSchema.safeParse(
						sanitizeAgentJsonConfig(parsed.data),
					);
					if (!zodResult.success) {
						return { ok: false, errors: formatZodErrors(zodResult.error) };
					}
					const emptyInstructions = rejectIfEmptyInstructions(
						zodResult.data,
						CLI_AGENT_CONFIG_MESSAGES,
					);
					if (emptyInstructions) {
						return { ok: false, errors: emptyInstructions };
					}
					const unsupportedNativeWebSearch = rejectIfUnsupportedNativeWebSearch(zodResult.data);
					if (unsupportedNativeWebSearch) {
						return { ok: false, errors: unsupportedNativeWebSearch };
					}
					const dynamicSelectorFromAi = rejectIfDynamicSelectorUsesFromAi(
						zodResult.data,
						snapshot.config,
						this.nodeTypes,
						CLI_AGENT_CONFIG_MESSAGES,
					);
					if (dynamicSelectorFromAi) {
						return { ok: false, errors: dynamicSelectorFromAi };
					}
					// Seed the builder's "native model gets web search by default" ergonomic
					// as an explicit flag; updateConfig owns the actual provider-tool
					// reconciliation so the write and read paths can't disagree.
					const configWithDefaults = applyPromptCachingBuilderDefaults(
						applyNativeWebSearchDefaultOn(zodResult.data),
					);
					try {
						const result = await this.agentConfigService.updateConfig(
							agentId,
							projectId,
							configWithDefaults,
						);
						return {
							ok: true,
							...snapshotFromConfig(result.config, result.updatedAt, result.versionId),
						};
					} catch (e) {
						return {
							ok: false,
							stage: 'schema',
							errors: [{ path: '(root)', message: e instanceof Error ? e.message : String(e) }],
						};
					}
				},
			)
			.build();

		const patchConfigTool = new Tool(BUILDER_TOOLS.PATCH_CONFIG)
			.description(
				'Apply RFC 6902 JSON Patch operations to the current agent configuration. ' +
					'Pass an array of patch operations as a JSON string. ' +
					'Requires baseConfigHash from the immediately preceding read_config result, or from a stale retry response. ' +
					'Do not use a configHash copied from the prompt snapshot. ' +
					'Supported ops: add, remove, replace, move, copy, test. ' +
					'Returns { ok: true, config, configHash, updatedAt, versionId } on success or ' +
					'{ ok: false, stage, errors } on failure. ' +
					'stage is "parse", "stale", "patch", or "schema".',
			)
			.input(
				z.object({
					operations: z.string().describe('RFC 6902 JSON Patch operations array as a JSON string'),
					baseConfigHash: z
						.string()
						.nullable()
						.describe(
							'configHash from the immediately preceding read_config result; null only if no config exists',
						),
				}),
			)
			.handler(
				async ({
					operations,
					baseConfigHash,
				}: {
					operations: string;
					baseConfigHash: string | null;
				}) => {
					const parsedOps = tryParseConfigJson(operations);
					if (!parsedOps.ok) {
						return { ok: false, stage: 'parse', errors: parsedOps.errors };
					}

					let snapshot: AgentConfigSnapshot;
					try {
						snapshot = await this.getConfigSnapshot(agentId, projectId);
					} catch (e) {
						return {
							ok: false,
							stage: 'stale',
							errors: [{ path: '(root)', message: e instanceof Error ? e.message : String(e) }],
						};
					}
					if (baseConfigHash !== snapshot.configHash) {
						return { ok: false, stage: 'stale', errors: [STALE_CONFIG_ERROR], ...snapshot };
					}
					if (!snapshot.config) {
						return {
							ok: false,
							stage: 'patch',
							errors: [{ path: '(root)', message: 'Agent has no JSON config yet.' }],
						};
					}

					const jsonpatch = (await import('fast-json-patch')).default;
					const ops = parsedOps.data as Operation[];
					const patchError = jsonpatch.validate(ops, snapshot.config);
					if (patchError) {
						const opPath =
							(patchError.operation as { path?: string } | undefined)?.path ?? '(root)';
						return {
							ok: false,
							stage: 'patch',
							errors: [{ path: opPath, message: patchError.message ?? 'Invalid patch operation' }],
						};
					}

					const patched = jsonpatch.applyPatch(jsonpatch.deepClone(snapshot.config), ops)
						.newDocument as unknown as AgentJsonConfig;

					const zodResult = RunnableAgentJsonConfigSchema.safeParse(
						sanitizeAgentJsonConfig(patched),
					);
					if (!zodResult.success) {
						return { ok: false, stage: 'schema', errors: formatZodErrors(zodResult.error) };
					}
					const emptyInstructions = rejectIfEmptyInstructions(
						zodResult.data,
						CLI_AGENT_CONFIG_MESSAGES,
					);
					if (emptyInstructions) {
						return { ok: false, stage: 'schema', errors: emptyInstructions };
					}
					const unsupportedNativeWebSearch = rejectIfUnsupportedNativeWebSearch(zodResult.data);
					if (unsupportedNativeWebSearch) {
						return { ok: false, stage: 'schema', errors: unsupportedNativeWebSearch };
					}
					const dynamicSelectorFromAi = rejectIfDynamicSelectorUsesFromAi(
						zodResult.data,
						snapshot.config,
						this.nodeTypes,
						CLI_AGENT_CONFIG_MESSAGES,
					);
					if (dynamicSelectorFromAi) {
						return { ok: false, stage: 'schema', errors: dynamicSelectorFromAi };
					}
					const configWithDefaults = applyPromptCachingBuilderDefaults(
						applyNativeWebSearchDefaultOn(zodResult.data),
					);

					try {
						const result = await this.agentConfigService.updateConfig(
							agentId,
							projectId,
							configWithDefaults,
						);
						return {
							ok: true,
							...snapshotFromConfig(result.config, result.updatedAt, result.versionId),
						};
					} catch (e) {
						return {
							ok: false,
							stage: 'schema',
							errors: [{ path: '(root)', message: e instanceof Error ? e.message : String(e) }],
						};
					}
				},
			)
			.build();

		const listIntegrationTypesTool = new Tool(BUILDER_TOOLS.LIST_INTEGRATION_TYPES)
			.description(
				"List integration types that can be added to the agent's `integrations` array. " +
					'Returns every available chat platform with the list of ' +
					'credential types it supports (`credentialTypes: string[]`) and builder guidance ' +
					'(`capabilities`, `useIntegrationWhen`, `useNodeToolWhen`). ' +
					'Use that guidance to decide whether the user needs a chat integration or a node tool. ' +
					'Call this BEFORE asking the user for a credential. Then pick ONE entry from the ' +
					'returned `credentialTypes` and pass it to `ask_credential` as the singular ' +
					'`credentialType` arg.',
			)
			.input(z.object({}))
			.handler(async () => this.agentIntegrationPersistenceService.listChatIntegrations())
			.build();

		const listSubAgentsTool = new Tool(BUILDER_TOOLS.LIST_SUB_AGENTS)
			.description(
				'List published agents in the same project that can be added to the target agent as subagents. ' +
					'Excludes the target agent itself and unpublished agents. Use before asking the user which ' +
					'subagents to add. Returned `agentId` values are the only valid values to write into `subAgents.agents[].agentId`; ' +
					'write parent-owned routing guidance into `subAgents.agents[].useWhen`; ask a follow-up first when it is unclear when that parent should use the subagent.',
			)
			.input(z.object({}))
			.handler(async () => {
				const agents = await this.agentsService.findByProjectId(projectId);
				return {
					agents: agents
						.filter((agent) => agent.id !== agentId && agent.activeVersionId !== null)
						.map((agent) => ({
							agentId: agent.id,
							name: agent.name,
						})),
				};
			})
			.build();

		const modelLookup: ModelLookup = {
			list: async (credentialId, credentialType, provider) =>
				await this.builderModelLiveLookupService.list(
					user,
					projectId,
					credentialId,
					credentialType,
					provider,
				),
		};

		const tools: BuiltTool[] = [
			readConfigTool,
			writeConfigTool,
			patchConfigTool,
			listIntegrationTypesTool,
			listSubAgentsTool,
			buildResolveLlmTool({ credentialProvider, modelLookup }),
			buildAskCredentialTool({
				credentialProvider,
				isCredentialTypeKnown: (credentialType) => this.credentialTypes.recognizes(credentialType),
			}),
			buildAskEmbeddingCredentialTool({
				credentialProvider,
				isCredentialTypeKnown: (credentialType) => this.credentialTypes.recognizes(credentialType),
				isAssistantProxyEnabled: () => this.aiService.isProxyEnabled(),
			}),
			buildAskLlmTool(),
			buildAskQuestionTool(),
			buildVerifyMcpServerTool({
				credentialProvider,
				oauthService: this.oauthService,
				projectId,
				proxyFetch: createAiMcpFetch(
					this.outboundHttp,
					this.ssrfConfig,
					this.ssrfProtectionService,
				),
			}),
			buildSearchMcpServersTool({ mcpRegistryService: this.mcpRegistryService }),
		];

		return tools;
	}

	private getSharedTools(
		agentId: string,
		projectId: string,
		credentialProvider: CredentialProvider,
		user: User,
	): BuiltTool[] {
		const buildCustomToolTool = new Tool(BUILDER_TOOLS.BUILD_CUSTOM_TOOL)
			.description(
				'Compile and store a custom tool. Pass the complete TypeScript source ' +
					'using `export default new Tool(...)` builder chain. The code is validated in a ' +
					'sandbox and saved against the agent. The returned `id` equals the tool name ' +
					'declared in the code (e.g. `new Tool("my_tool")` → id `"my_tool"`). ' +
					'This does NOT register the tool in the agent config — follow up with ' +
					'patch_config (or write_config) to add `{ type: "custom", id: "<tool name>" }` ' +
					'to `tools`.' +
					'Returns { ok: true, id, descriptor } or { ok: false, errors }.',
			)
			.input(
				z.object({
					code: z
						.string()
						.describe('Complete TypeScript source using export default new Tool(...)'),
				}),
			)
			.handler(async ({ code }: { code: string }) => {
				try {
					const descriptor = await this.secureRuntime.describeToolSecurely(code);
					const built = await this.agentCustomToolsService.buildCustomTool(
						agentId,
						projectId,
						code,
						descriptor,
					);
					return { ok: true, id: built.id, descriptor };
				} catch (e) {
					return {
						ok: false,
						errors: [{ message: e instanceof Error ? e.message : String(e) }],
					};
				}
			})
			.build();

		const createSkillTool = new Tool(BUILDER_TOOLS.CREATE_SKILL)
			.description(
				'Create and store an agent skill (a reusable, load-on-demand capability). Pass the skill name, a ' +
					'routing description, and the full skill instructions. The description is what the runtime sees when ' +
					'deciding when to load it, and the instructions MUST follow the required structured format (Overview, ' +
					'Inputs, Steps, Rules, Example, Gotchas) filled with concrete content — see the instructions parameter ' +
					'for the template. You MUST NOT call this with a vague description or thin/placeholder instructions: ' +
					'if you lack the domain detail to write a genuinely useful skill, ask the user clarifying ' +
					'questions first. Use allowedTools only with exact target-agent tool names, ' +
					'and references only for markdown supporting files under the references/ directory. References are not automatically loaded; when you provide references, instructions must say exactly when to load each one by path. Scripts and non-markdown linked files are not supported. ' +
					'This does NOT attach the skill to the agent config; follow up with read_config ' +
					'and patch_config (or write_config) to add a `{ type: "skill", id }` entry to `skills`. ' +
					'Returns { ok: true, id, skill } or { ok: false, errors }.',
			)
			.systemInstruction(
				'Never create a vague or placeholder skill. The description is the routing contract (what the ' +
					'skill does + when to load it); the instructions must follow the required structured Markdown template ' +
					'(Overview, Inputs, Steps, Rules, Example, Gotchas) with each applicable section filled in with ' +
					'concrete, specific content. If you do not have enough domain detail to write a genuinely ' +
					'useful skill, ask the user clarifying questions until you do before calling create_skill. ' +
					'Do not create references unless the instructions include explicit conditions for loading each referenced file. ' +
					'Do not invent tool names or reference paths.',
			)
			.input(createSkillInputSchema)
			.handler(async (input: CreateSkillInput) => {
				// Input is already validated against `.input()` (agentSkillSchema
				// shapes) by the tool runtime before the handler runs.
				const skill: AgentSkill = input;

				try {
					const created = await this.agentSkillsService.createSkill(agentId, projectId, skill);
					return { ok: true, id: created.id, skill: created.skill };
				} catch (e) {
					return {
						ok: false,
						errors: [{ message: e instanceof Error ? e.message : String(e) }],
					};
				}
			})
			.build();

		const createTaskTool = new Tool(BUILDER_TOOLS.CREATE_TASK)
			.description(
				'Create a recurring scheduled task for the target agent (name + objective + cron schedule). ' +
					'The objective is the exact message the agent receives on each run, so it must be precise and ' +
					'self-contained, and it MUST follow the required structured format (Objective, Context, Steps, ' +
					'Output, Constraints, Success criteria) with every section filled in — see the objective ' +
					'parameter for the template. You MUST NOT call this tool with a vague, broad, or placeholder ' +
					'objective, an objective missing any section, or an unclear schedule. First make sure you can ' +
					'fill every section of the template and know how often/when it should run; if anything is ' +
					'ambiguous, ask the user clarifying questions (ask_question with discrete options for choices, ' +
					'or empty options for open-ended) and only call create_task once the objective is complete and the cadence ' +
					'is known. This adds a `{ type: "task", id, enabled }` ref to the agent config (config.tasks) ' +
					'and the task starts running once the agent is (re)published. Returns { ok: true, task } or ' +
					'{ ok: false, errors }.',
			)
			.systemInstruction(
				'Never create a task with a vague or placeholder objective. The objective must follow the ' +
					'required structured Markdown template (Objective, Context, Steps, Output, Constraints, ' +
					'Success criteria) with every section filled in with concrete content. If the user has not ' +
					'given you enough detail to complete every section and set a clear schedule, ask clarifying ' +
					'questions first. A task can only use tools the agent already has: if any step in the ' +
					'objective requires a tool, integration, or web search the agent is missing, you MUST add ' +
					'it to the agent config (patch_config/write_config) BEFORE calling create_task — otherwise ' +
					'the task will fail at runtime.',
			)
			.input(
				z.object({
					name: agentTaskSchema.shape.name.describe('Short, human-readable task name.'),
					objective: agentTaskSchema.shape.objective.describe(TASK_OBJECTIVE_GUIDANCE),
					cronExpression: agentTaskSchema.shape.cronExpression.describe(
						'A 5-field cron expression for when the task runs, e.g. "0 9 * * 1-5" = weekdays at 09:00.',
					),
				}),
			)
			.handler(
				async ({
					name,
					objective,
					cronExpression,
				}: {
					name: string;
					objective: string;
					cronExpression: string;
				}) => {
					// Input is already validated against `.input()` (agentTaskSchema
					// shapes) by the tool runtime before the handler runs.
					const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
					if (!agent) {
						return { ok: false, errors: [{ message: 'Agent not found' }] };
					}

					try {
						// Adds a `{ type:'task', id, enabled }` ref to the agent config and
						// creates the body. Enabled by default; it starts running once the
						// agent is (re)published.
						const task = await this.agentTaskService.create(agentId, {
							name,
							objective,
							cronExpression,
							enabled: true,
						});
						return { ok: true, task };
					} catch (e) {
						return {
							ok: false,
							errors: [{ message: e instanceof Error ? e.message : String(e) }],
						};
					}
				},
			)
			.build();

		const listWorkflowsTool = new Tool('list_workflows')
			.description(
				'List the n8n workflows that can be attached as tools via `type: "workflow"` in the agent config. ' +
					'ALWAYS call this at the start — workflows are the preferred way to give agents real capabilities ' +
					'(sending emails, creating calendar events, querying databases, calling APIs, etc.). ' +
					'Only returns workflows with supported trigger types. Pass `searchTerm` to narrow by workflow name; ' +
					'omitting it returns the 10 most recently updated attachable workflows.',
			)
			.input(
				z.object({
					searchTerm: z
						.string()
						.optional()
						.describe('Optional workflow-name search term. Omit to return the first 10 results.'),
				}),
			)
			.handler(async ({ searchTerm }: { searchTerm?: string }) => {
				return {
					workflows: await this.attachableWorkflowsService.list(user, projectId, searchTerm),
				};
			})
			.build();

		return [
			buildCustomToolTool,
			createSkillTool,
			createTaskTool,
			listWorkflowsTool,
			buildGetResourceLocatorOptionsTool({
				dynamicNodeParametersService: this.dynamicNodeParametersService,
				nodeTypes: this.nodeTypes,
				user,
				projectId,
			}),
			...this.agentsToolsService.getSharedTools(
				credentialProvider,
				'Read-only inspection of available credentials. Use ask_credential to let the user ' +
					'pick the credential to wire into a node tool — never copy ids from this list directly ' +
					'into the config.',
			),
		];
	}

	private async getConfigSnapshot(
		agentId: string,
		projectId: string,
	): Promise<AgentConfigSnapshot> {
		const agent = await this.agentsService.findById(agentId, projectId);
		if (!agent) throw new Error('Agent not found');

		const config = composeJsonConfig(agent);
		return snapshotFromConfig(config, agent.updatedAt.toISOString(), agent.versionId);
	}
}
