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
	AgentJsonConfigSchema,
	isDraftAgentConfig,
	isDraftIntegration,
	sanitizeAgentJsonConfig,
	tryParseConfigJson,
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
import { userHasScopes } from '@/permissions.ee/check-access';
import { AiService } from '@/services/ai.service';
import { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';
import { FreeAiCreditsService } from '@/services/free-ai-credits.service';
import { Telemetry } from '@/telemetry';
import { createAiMcpFetch } from '@/utils/ai-proxy-fetch';

import { AgentConfigService } from '../agent-config.service';
import { AgentCustomToolsService } from '../agent-custom-tools.service';
import { AgentIntegrationPersistenceService } from '../agent-integration-persistence.service';
import { AgentPublishService } from '../agent-publish.service';
import { AgentSkillsService } from '../agent-skills.service';
import { AgentTaskService } from '../agent-task.service';
import { AgentValidationService } from '../agent-validation.service';
import { AgentsToolsService } from '../agents-tools.service';
import { AgentsService } from '../agents.service';
import { AttachableWorkflowsService } from '../attachable-workflows.service';
import { BuilderModelLiveLookupService } from './builder-model-live-lookup.service';
import { BUILDER_TOOLS } from './builder-tool-names';
import { buildGetResourceLocatorOptionsTool } from './get-resource-locator-options.tool';
import {
	buildAskCredentialTool,
	buildAskEmbeddingCredentialTool,
	buildAskQuestionsTool,
	buildConfigureChannelTool,
	buildFinishSetupTool,
	buildResolveLlmTool,
} from './interactive';
import type { ModelLookup } from './interactive/resolve-llm.tool';
import { buildResolveIntegrationTool } from './resolve-integration.tool';
import { buildSearchMcpServersTool } from './search-mcp-servers.tool';
import { SKILL_BODY_GUIDANCE, SKILL_DESCRIPTION_RULE } from './skill-body-template';
import { TASK_OBJECTIVE_GUIDANCE } from './task-objective-template';
import { buildVerifyMcpServerTool } from './verify-mcp-server.tool';
import { composeJsonConfig } from '../json-config/agent-config-composition';
import { AgentSecureRuntime } from '../runtime/agent-secure-runtime';

const STALE_CONFIG_ERROR: ConfigValidationError = {
	path: '(root)',
	message:
		'Agent config changed since you last read it. Call read_config, then retry using the config and configHash it returns.',
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

interface AgentConfigSnapshot {
	config: AgentJsonConfig | null;
	configHash: string | null;
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

function snapshotFromConfig(config: AgentJsonConfig | null): AgentConfigSnapshot {
	return {
		config,
		configHash: getAgentConfigHash(config),
	};
}

/**
 * Once the stored config has a model, a builder write can't clear it back to
 * a draft (`model: ""`). A missing credential does NOT reject the write —
 * it surfaces as a `missing_credential` validation issue instead.
 */
function parseBuilderWriteConfig(incoming: unknown, currentConfig: AgentJsonConfig | null) {
	const sanitized = sanitizeAgentJsonConfig(incoming);
	if (
		!isDraftAgentConfig(currentConfig) &&
		isDraftAgentConfig(sanitized as { model?: string } | null | undefined)
	) {
		return {
			success: false as const,
			error: new z.ZodError([
				{
					code: z.ZodIssueCode.custom,
					path: ['model'],
					message: 'Model cannot be cleared once set',
				},
			]),
		};
	}
	return AgentJsonConfigSchema.safeParse(sanitized);
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
		private readonly agentPublishService: AgentPublishService,
		private readonly aiService: AiService,
		private readonly outboundHttp: OutboundHttp,
		private readonly dynamicNodeParametersService: DynamicNodeParametersService,
		private readonly nodeTypes: NodeTypes,
		private readonly ssrfConfig: SsrfProtectionConfig,
		private readonly ssrfProtectionService: SsrfProtectionService,
		private readonly freeAiCreditsService: FreeAiCreditsService,
		private readonly telemetry: Telemetry,
		private readonly agentValidationService: AgentValidationService,
	) {}

	/**
	 * Stamps `configMutated: true` + the target agentId onto successful results of
	 * config-mutating tools, so the FE can refresh the agent artifact panel from a
	 * single semantic field instead of a per-tool allowlist.
	 */
	private withConfigMutationMarker(tool: BuiltTool, agentId: string): BuiltTool {
		const handler = tool.handler;
		if (!handler) return tool;
		return {
			...tool,
			handler: async (input, ctx) => {
				const result = await handler(input, ctx);
				if (
					typeof result === 'object' &&
					result !== null &&
					(('ok' in result && result.ok === true) ||
						('connected' in result && result.connected === true) ||
						('completed' in result && result.completed === true))
				) {
					return { ...result, configMutated: true, agentId };
				}
				return result;
			},
		};
	}

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
				'Read the latest persisted agent configuration and its freshness token. ' +
					'Returns { ok: true, config, configHash }. This is the only tool that returns the full config — ' +
					'write_config, patch_config, and stale responses never echo it back. ' +
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
					'Requires baseConfigHash from the immediately preceding read_config result — never from a prior ' +
					'write_config/patch_config success or from a stale response. ' +
					'Returns { ok: true, configMutated: true, agentId } on success — no config, hash, or timestamps are returned; call ' +
					'read_config again before any later inspection or mutation — or ' +
					'{ ok: false, stage, errors } with path, message, expected, received fields on failure. ' +
					'On stage: "stale", call read_config and retry once using its fresh config and configHash.',
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
						return { ok: false, stage: 'stale', errors: [STALE_CONFIG_ERROR] };
					}
					const zodResult = parseBuilderWriteConfig(parsed.data, snapshot.config);
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
						await this.agentConfigService.updateConfig(agentId, projectId, configWithDefaults);
						return { ok: true };
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
					'Requires baseConfigHash from the immediately preceding read_config result — never from a prior ' +
					'write_config/patch_config success or from a stale response. ' +
					'Supported ops: add, remove, replace, move, copy, test. ' +
					'Returns { ok: true, configMutated: true, agentId } on success — no config, hash, or timestamps are returned; call ' +
					'read_config again before any later inspection or mutation — or ' +
					'{ ok: false, stage, errors } on failure. ' +
					'stage is "parse", "stale", "patch", or "schema". On stage: "stale", call read_config and retry ' +
					'once using its fresh config and configHash.',
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
						return { ok: false, stage: 'stale', errors: [STALE_CONFIG_ERROR] };
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

					const zodResult = parseBuilderWriteConfig(patched, snapshot.config);
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
						await this.agentConfigService.updateConfig(agentId, projectId, configWithDefaults);
						return { ok: true };
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
					'For a chat integration, pass the selected integration `type` to `configure_channel`; ' +
					'never use `ask_credential` for chat-channel credentials.',
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

		const publishAgentTool = new Tool(BUILDER_TOOLS.PUBLISH_AGENT)
			.description(
				'Publish this target agent so it becomes live: integrations sync and scheduled tasks start running. ' +
					'Idempotent when the draft is already the active published version. Pass optional `versionId` to ' +
					'activate an existing history row instead of publishing the current draft. Call only when the user ' +
					'asks to publish, activate, or make the agent live/usable — never tell them to click Publish in the editor. ' +
					'Returns { ok: true, configMutated: true, agentId, activeVersionId, versionId } or { ok: false, errors }.',
			)
			.input(
				z.object({
					versionId: z
						.string()
						.min(1)
						.optional()
						.describe(
							'Optional history version ID to activate. Omit to publish the current draft.',
						),
				}),
			)
			.handler(async ({ versionId }: { versionId?: string }) => {
				if (!(await userHasScopes(user, ['agent:publish'], false, { projectId }))) {
					return {
						ok: false,
						errors: [{ message: 'You do not have permission to publish agents in this project.' }],
					};
				}
				try {
					const { agent } = await this.agentPublishService.publishAgent(
						agentId,
						projectId,
						user,
						versionId,
					);
					return {
						ok: true,
						agentId,
						activeVersionId: agent.activeVersionId,
						versionId: agent.versionId,
					};
				} catch (e) {
					return {
						ok: false,
						errors: [{ message: e instanceof Error ? e.message : String(e) }],
					};
				}
			})
			.build();

		const unpublishAgentTool = new Tool(BUILDER_TOOLS.UNPUBLISH_AGENT)
			.description(
				'Unpublish this target agent: clears the live version while preserving the draft, disconnects chat ' +
					'integrations, and stops scheduled tasks. Call when the user asks to unpublish or take the agent offline. ' +
					'Returns { ok: true, configMutated: true, agentId, activeVersionId: null } or { ok: false, errors }.',
			)
			.input(z.object({}))
			.handler(async () => {
				if (!(await userHasScopes(user, ['agent:unpublish'], false, { projectId }))) {
					return {
						ok: false,
						errors: [
							{ message: 'You do not have permission to unpublish agents in this project.' },
						],
					};
				}
				try {
					await this.agentPublishService.unpublishAgent(agentId, projectId);
					return { ok: true, agentId, activeVersionId: null };
				} catch (e) {
					return {
						ok: false,
						errors: [{ message: e instanceof Error ? e.message : String(e) }],
					};
				}
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
			this.withConfigMutationMarker(writeConfigTool, agentId),
			this.withConfigMutationMarker(patchConfigTool, agentId),
			listIntegrationTypesTool,
			listSubAgentsTool,
			this.withConfigMutationMarker(publishAgentTool, agentId),
			this.withConfigMutationMarker(unpublishAgentTool, agentId),
			buildResolveLlmTool({
				credentialProvider,
				modelLookup,
				freeCredits: {
					isEligible: () => this.freeAiCreditsService.isEligible(user),
					claim: async () => {
						const credential = await this.freeAiCreditsService.claim(user, projectId);
						this.telemetry.track('User claimed OpenAI credits', {
							user_id: user.id,
							source: 'agentBuilderResolveLlm',
						});
						return { credentialId: credential.id, credentialName: credential.name };
					},
				},
			}),
			buildAskCredentialTool({
				credentialProvider,
				isCredentialTypeKnown: (credentialType) => this.credentialTypes.recognizes(credentialType),
				listIntegrationCredentialIds: async () => {
					const agent = await this.agentsService.findById(agentId, projectId);
					return (agent?.integrations ?? [])
						.filter((integration) => !isDraftIntegration(integration))
						.map((integration) => integration.credentialId);
				},
			}),
			buildAskEmbeddingCredentialTool({
				credentialProvider,
				isCredentialTypeKnown: (credentialType) => this.credentialTypes.recognizes(credentialType),
				isAssistantProxyEnabled: () => this.aiService.isProxyEnabled(),
			}),
			buildAskQuestionsTool(),
			this.withConfigMutationMarker(
				buildConfigureChannelTool({
					agentId,
					projectId,
					listChatIntegrationTypes: () =>
						this.agentIntegrationPersistenceService
							.listChatIntegrations()
							.map((integration) => integration.type),
				}),
				agentId,
			),
			this.withConfigMutationMarker(
				buildFinishSetupTool({
					credentialProvider,
					agentId,
					projectId,
					isCredentialTypeKnown: (credentialType) =>
						this.credentialTypes.recognizes(credentialType),
					listIntegrationCredentialIds: async () => {
						const agent = await this.agentsService.findById(agentId, projectId);
						return (agent?.integrations ?? [])
							.filter((integration) => !isDraftIntegration(integration))
							.map((integration) => integration.credentialId);
					},
					listChatIntegrationTypes: () =>
						this.agentIntegrationPersistenceService
							.listChatIntegrations()
							.map((integration) => integration.type),
					getPublishBlockers: async () => {
						// Connecting a channel auto-publishes the agent, so gate it on the
						// same publish validation. Integration issues are excluded: the
						// draft channel entry itself (`credentialId: ""`) always reports
						// missing_credential, and that's exactly what this channel phase
						// is about to resolve.
						const { issues } = await this.agentValidationService.validateAgentConfiguration(
							agentId,
							projectId,
							credentialProvider,
							'publish',
						);
						return issues
							.filter((issue) => !issue.path.startsWith('integrations.'))
							.map((issue) => ({ path: issue.path, code: issue.code }));
					},
				}),
				agentId,
			),
			buildVerifyMcpServerTool({
				agentId,
				credentialProvider,
				oauthService: this.oauthService,
				projectId,
				proxyFetch: createAiMcpFetch(
					this.outboundHttp,
					this.ssrfConfig,
					this.ssrfProtectionService,
				),
				applyCredentialToMcpServer: async (serverName, credentialId) =>
					await this.applyCredentialToMcpServer(agentId, projectId, serverName, credentialId),
			}),
			buildSearchMcpServersTool({ mcpRegistryService: this.mcpRegistryService }),
			buildResolveIntegrationTool({
				mcpRegistryService: this.mcpRegistryService,
				agentsToolsService: this.agentsToolsService,
			}),
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
					'Returns { ok: true, id, name } or { ok: false, errors }.',
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
					return { ok: true, id: built.id, name: descriptor.name };
				} catch (e) {
					return {
						ok: false,
						errors: [{ message: e instanceof Error ? e.message : String(e) }],
					};
				}
			})
			.build();

		const createSkillsTool = new Tool(BUILDER_TOOLS.CREATE_SKILLS)
			.description(
				'Create and store one or more agent skills (reusable, load-on-demand capabilities) in a ' +
					'single call. Pass every skill you currently know how to write in one `skills` array — do ' +
					"not spread multiple fully-specified skills across separate calls; each skill's instructions " +
					'field carries its own structured template. The whole batch is all-or-nothing: an invalid or ' +
					'duplicate-named skill rejects every skill in the call. This does NOT attach the skills to the ' +
					'agent config; follow up with read_config and patch_config (or write_config) to add a ' +
					'`{ type: "skill", id }` entry per skill to `skills`. Returns { ok: true, skills: [{ id, name }, ' +
					'...] } (same order as input, bodies are not echoed back) or { ok: false, errors }.',
			)
			.systemInstruction(
				'Never create a vague or placeholder skill. The description field is the routing contract the ' +
					'runtime uses to decide when to load the skill; the instructions must follow the required ' +
					'structured Markdown template (Overview, Inputs, Steps, Rules, Example, Gotchas) with each ' +
					'applicable section filled in with concrete, specific content. If you do not have enough domain ' +
					"detail to write a genuinely useful skill, derive it from the user's goal as stated assumptions " +
					'listed in your summary; ask the user clarifying questions only when even a reasonable ' +
					'assumption is impossible. Use allowedTools only with exact target-agent tool names. Use references ' +
					'only for markdown supporting files under the references/ directory — references are not ' +
					'automatically loaded, so instructions must say exactly when to load each one by path; scripts and ' +
					'non-markdown linked files are not supported. Do not invent tool names or reference paths. Batch ' +
					'every skill you currently know how to write into one call.',
			)
			.input(
				z.object({
					skills: z
						.array(createSkillInputSchema)
						.min(1)
						.max(20)
						.describe('Every skill to create, in the order they should be created.'),
				}),
			)
			.handler(async ({ skills }: { skills: CreateSkillInput[] }) => {
				// Each skill is already validated against `.input()` (agentSkillSchema
				// shapes) by the tool runtime before the handler runs.
				try {
					const created = await this.agentSkillsService.createSkills(agentId, projectId, skills);
					return {
						ok: true,
						skills: created.map(({ id, skill }) => ({ id, name: skill.name })),
					};
				} catch (e) {
					return {
						ok: false,
						errors: [{ message: e instanceof Error ? e.message : String(e) }],
					};
				}
			})
			.build();

		const createTasksTool = new Tool(BUILDER_TOOLS.CREATE_TASKS)
			.description(
				'Create one or more recurring scheduled tasks for the target agent (name + objective + cron ' +
					'schedule per task) in a single call. Pass every task you currently know how to write in one ' +
					"`tasks` array — do not spread multiple fully-specified tasks across separate calls; each task's " +
					'objective field carries its own structured template. The whole batch is all-or-nothing: an ' +
					'invalid cron or objective rejects every task in the call. This adds a `{ type: "task", id, ' +
					'enabled }` ref per task to the agent config (config.tasks) and each task starts running once ' +
					'the agent is (re)published via `publish_agent`. Returns { ok: true, configMutated: true, agentId, tasks: [{ id, name, enabled }, ...] } (same ' +
					'order as input, objectives and crons are not echoed back) or { ok: false, errors }.',
			)
			.systemInstruction(
				'Never create a task with a vague, broad, or placeholder objective, an objective missing any ' +
					'required section, or an unclear schedule. Each objective must follow the required structured ' +
					'Markdown template (Objective, Context, Steps, Output, Constraints, Success criteria) with every ' +
					'section filled in with concrete content — it is the exact, self-contained message the agent ' +
					"receives on each unattended run. If anything is ambiguous, derive it from the user's goal as " +
					'stated assumptions listed in your summary; ask the user clarifying questions with ask_questions ' +
					'only when even a reasonable assumption is impossible, before calling ' +
					'create_tasks. A task can only use tools the agent already has: if any step in an objective ' +
					'requires a tool, integration, or web search the agent is missing, you MUST add it to the agent ' +
					'config (patch_config/write_config) BEFORE calling create_tasks — otherwise the task will fail at ' +
					'runtime. Batch every task you currently know how to write into one call.',
			)
			.input(
				z.object({
					tasks: z
						.array(
							z.object({
								name: agentTaskSchema.shape.name.describe('Short, human-readable task name.'),
								objective: agentTaskSchema.shape.objective.describe(TASK_OBJECTIVE_GUIDANCE),
								cronExpression: agentTaskSchema.shape.cronExpression.describe(
									'A 5-field cron expression for when the task runs, e.g. "0 9 * * 1-5" = weekdays at 09:00.',
								),
							}),
						)
						.min(1)
						.max(20)
						.describe('Every task to create, in the order they should be created.'),
				}),
			)
			.handler(
				async ({
					tasks,
				}: {
					tasks: Array<{ name: string; objective: string; cronExpression: string }>;
				}) => {
					// Each task is already validated against `.input()` (agentTaskSchema
					// shapes) by the tool runtime before the handler runs.
					try {
						// Adds a `{ type:'task', id, enabled }` ref per task to the agent config
						// and creates every body in one transaction. Enabled by default; each
						// task starts running once the agent is (re)published via publish_agent.
						const created = await this.agentTaskService.createTasks(
							agentId,
							projectId,
							tasks.map((task) => ({ ...task, enabled: true })),
						);
						return {
							ok: true,
							tasks: created.map(({ id, name }) => ({ id, name, enabled: true as const })),
						};
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
			createSkillsTool,
			this.withConfigMutationMarker(createTasksTool, agentId),
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
		return snapshotFromConfig(config);
	}

	private async applyCredentialToMcpServer(
		agentId: string,
		projectId: string,
		serverName: string,
		credentialId: string,
	): Promise<{ applied: boolean }> {
		const snapshot = await this.getConfigSnapshot(agentId, projectId);
		const config = snapshot.config;
		const servers = config?.mcpServers;
		if (!config || !servers) {
			return { applied: false };
		}

		const serverIndex = servers.findIndex((server) => server.name === serverName);
		if (serverIndex === -1) {
			return { applied: false };
		}

		if (servers[serverIndex]?.credential === credentialId) {
			return { applied: false };
		}

		// Only one field changes, so shallow copies are enough — no deep clone.
		const patched: AgentJsonConfig = {
			...config,
			mcpServers: servers.map((server, index) =>
				index === serverIndex ? { ...server, credential: credentialId } : server,
			),
		};

		const zodResult = parseBuilderWriteConfig(patched, snapshot.config);
		if (!zodResult.success) {
			throw new Error(formatZodErrors(zodResult.error)[0]?.message ?? 'Invalid MCP server config');
		}

		const configWithDefaults = applyPromptCachingBuilderDefaults(
			applyNativeWebSearchDefaultOn(zodResult.data),
		);

		await this.agentConfigService.updateConfig(agentId, projectId, configWithDefaults);
		return { applied: true };
	}
}
