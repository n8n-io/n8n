import {
	isAbortError,
	type BuiltTool,
	type CredentialProvider,
	type InterruptibleToolContext,
} from '@n8n/agents';
import {
	APPROVAL_RESUME_SCHEMA,
	APPROVAL_SUSPEND_SCHEMA,
	Tool,
	type ApprovalResumePayload,
	type ApprovalSuspendPayload,
} from '@n8n/agents/tool';
import {
	applyNativeWebSearchDefaultOn,
	getProviderPrefix,
	rejectIfDynamicSelectorUsesFromAi,
	rejectIfEmptyInstructions,
	rejectIfUnsupportedNativeWebSearch,
	type AgentConfigValidationMessages,
} from '@n8n/ai-utilities/agent-config';
import {
	AGENT_SKILL_REFERENCE_MAX_COUNT,
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
import { OutboundHttp } from '@n8n/backend-network';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { InstanceAiCredentialService } from '@n8n/instance-ai';
import type { Operation } from 'fast-json-patch';
import { z } from 'zod';

import { CredentialTypes } from '@/credential-types';
import { McpRegistryService } from '@/modules/mcp-registry/registry/mcp-registry.service';
import { NodeTypes } from '@/node-types';
import { OauthService } from '@/oauth/oauth.service';
import { userHasScopes } from '@/permissions.ee/check-access';
import { AiGatewayService } from '@/services/ai-gateway.service';
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
import {
	AgentTestRunService,
	collectStandardApprovals,
	InvalidAgentTestRunCheckpointError,
	type AgentTestRunResult,
} from '../agent-test-run.service';
import { AgentsToolsService } from '../agents-tools.service';
import { AgentsService } from '../agents.service';
import { AttachableWorkflowsService } from '../attachable-workflows.service';
import type { BuilderTrackFn } from './builder-config-telemetry';
import { buildAgentPreviewPath } from './agent-builder-preview-path';
import { describeCallAgentFailure } from './call-agent-failure';
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
import { listAiGatewayManagedCredentialTypes } from '../json-config/reconcile-node-tool-gateway-credentials';
import { AgentSecureRuntime } from '../runtime/agent-secure-runtime';
import { getAgentConfigHash } from '../utils/agent-config-hash';

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

const readSkillInputSchema = z
	.object({
		skillId: z.string().min(1).describe('Persisted target-agent skill id to read.'),
		referencePaths: z
			.array(z.string().min(1))
			.max(AGENT_SKILL_REFERENCE_MAX_COUNT)
			.optional()
			.describe(
				'Optional reference paths whose content is needed. Omit to receive paths and UTF-8 byte sizes only.',
			),
	})
	.strict();

type ReadSkillInput = z.infer<typeof readSkillInputSchema>;

const updateSkillFieldsSchema = z
	.object({
		name: agentSkillSchema.shape.name.optional(),
		description: agentSkillSchema.shape.description.optional(),
		instructions: agentSkillSchema.shape.instructions.optional(),
		allowedTools: agentSkillSchema.shape.allowedTools.unwrap().min(1).nullable().optional(),
		references: agentSkillSchema.shape.references
			.unwrap()
			.refine((references) => references.length > 0, 'Pass null to clear references.')
			.nullable()
			.optional(),
	})
	.strict()
	.refine((updates) => Object.keys(updates).length > 0, {
		message: 'At least one skill field must be supplied.',
	});

const updateSkillInputSchema = z
	.object({
		skillId: z.string().min(1).describe('Persisted target-agent skill id to update.'),
		updates: updateSkillFieldsSchema.describe(
			'Only the fields to change. Pass null for allowedTools or references to remove that field; empty arrays are invalid.',
		),
	})
	.strict();

type UpdateSkillInput = z.infer<typeof updateSkillInputSchema>;

const updateTaskFieldsSchema = z
	.object({
		name: agentTaskSchema.shape.name.optional(),
		objective: agentTaskSchema.shape.objective.optional().describe(TASK_OBJECTIVE_GUIDANCE),
		cronExpression: agentTaskSchema.shape.cronExpression.optional(),
		timezone: agentTaskSchema.shape.timezone.describe(
			'IANA zone the cron runs in. Pass null to move the task back to the instance timezone.',
		),
	})
	.strict()
	.refine((updates) => Object.keys(updates).length > 0, {
		message: 'At least one task field must be supplied.',
	});

const updateTaskInputSchema = z
	.object({
		taskId: z.string().min(1).describe('Persisted target-agent task id to update.'),
		updates: updateTaskFieldsSchema.describe('Only the task fields to change.'),
	})
	.strict();

type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;

interface AgentConfigSnapshot {
	config: AgentJsonConfig | null;
	configHash: string | null;
}

/** Builder-session context threaded through telemetry so it's joinable to `instance_ai_agent_build_route`. */
interface BuilderTelemetryContext {
	threadId?: string;
	runId?: string;
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
		private readonly agentTestRunService: AgentTestRunService,
		private readonly aiService: AiService,
		private readonly aiGatewayService: AiGatewayService,
		private readonly outboundHttp: OutboundHttp,
		private readonly dynamicNodeParametersService: DynamicNodeParametersService,
		private readonly nodeTypes: NodeTypes,
		private readonly freeAiCreditsService: FreeAiCreditsService,
		private readonly telemetry: Telemetry,
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
						('configured' in result && result.configured === true) ||
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
		credentialService: InstanceAiCredentialService,
		user: User,
		telemetryContext?: BuilderTelemetryContext,
	): BuilderTools {
		return {
			json: this.getJsonTools(
				agentId,
				projectId,
				credentialProvider,
				credentialService,
				user,
				telemetryContext,
			),
			shared: this.getSharedTools(agentId, projectId, credentialProvider, user),
		};
	}

	private getJsonTools(
		agentId: string,
		projectId: string,
		credentialProvider: CredentialProvider,
		credentialService: InstanceAiCredentialService,
		user: User,
		telemetryContext?: BuilderTelemetryContext,
	): BuiltTool[] {
		const track: BuilderTrackFn = (entry, properties) =>
			this.telemetry.track(entry, {
				agent_id: agentId,
				user_id: user.id,
				...(telemetryContext?.threadId ? { thread_id: telemetryContext.threadId } : {}),
				...(telemetryContext?.runId ? { run_id: telemetryContext.runId } : {}),
				...properties,
			});
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
					const snapshot = await this.getConfigSnapshot(agentId, projectId);
					return { ok: true, ...snapshot };
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
						await this.agentConfigService.updateConfig(
							agentId,
							projectId,
							configWithDefaults,
							user,
							{ modifiedBy: 'builder' },
						);
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
						await this.agentConfigService.updateConfig(
							agentId,
							projectId,
							configWithDefaults,
							user,
							{ modifiedBy: 'builder' },
						);
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
				'List agents in the same project that can be added to the target agent as subagents. ' +
					'Excludes the target agent itself. Use before asking the user which subagents to add. ' +
					'Returned `agentId` values are the only valid values to write into `subAgents.agents[].agentId`; ' +
					'write parent-owned routing guidance into `subAgents.agents[].useWhen`; ask a follow-up first when it is unclear when that parent should use the subagent.',
			)
			.input(z.object({}))
			.handler(async () => {
				const agents = await this.agentsService.findByProjectId(projectId);
				return {
					agents: agents
						.filter((agent) => agent.id !== agentId)
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
						{ by: 'builder', trigger: 'explicit' },
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
					await this.agentPublishService.unpublishAgent(agentId, projectId, user, 'builder');
					return { ok: true, agentId, activeVersionId: null };
				} catch (e) {
					return {
						ok: false,
						errors: [{ message: e instanceof Error ? e.message : String(e) }],
					};
				}
			})
			.build();

		const callAgentTool = new Tool(BUILDER_TOOLS.CALL_AGENT)
			.description(
				'Tests the draft agent through built-in Preview chat. It does not test configured channel integrations, including their triggers, platform context, message delivery, or replies. ' +
					'Pass the returned sessionId on later calls to continue the same conversation; omit it to start a new one. ' +
					'The draft uses its real configured tools and credentials, so external side effects are possible. ' +
					'Standard tool approvals pause this test until the user approves or rejects them in chat. ' +
					'Unsupported interactive requests return approval_required with a Preview path.',
			)
			.input(
				z.object({
					message: z.string().trim().min(1).describe('Message to send to the target agent'),
					sessionId: z
						.string()
						.trim()
						.min(1)
						.optional()
						.describe('Session ID from a previous call_agent result'),
				}),
			)
			.suspend(APPROVAL_SUSPEND_SCHEMA)
			.resume(APPROVAL_RESUME_SCHEMA)
			.handler(
				async (
					{ message, sessionId }: { message: string; sessionId?: string },
					ctx: InterruptibleToolContext<ApprovalSuspendPayload, ApprovalResumePayload>,
				) => {
					if (!(await userHasScopes(user, ['agent:execute'], false, { projectId }))) {
						return {
							status: 'error',
							code: 'forbidden',
							message: 'You do not have permission to run agents in this project.',
						};
					}

					const previewPath = buildAgentPreviewPath(projectId, agentId);
					try {
						let result: AgentTestRunResult;
						if (ctx.resumeData === undefined) {
							result = await this.agentTestRunService.executeDraftRun({
								agentId,
								projectId,
								message,
								sessionId,
								credentialProvider,
								user,
								source: 'instance-ai',
								...(ctx.abortSignal ? { abortSignal: ctx.abortSignal } : {}),
							});
						} else {
							result = await this.agentTestRunService.resumeDraftApproval({
								agentId,
								projectId,
								continuation: ctx.continuation,
								approved: ctx.resumeData.approved,
								user,
								source: 'instance-ai',
								...(ctx.abortSignal ? { abortSignal: ctx.abortSignal } : {}),
							});
						}

						if (result.status === 'session_not_found') {
							return {
								status: 'error',
								code: 'session_not_found',
								message: 'Session not found.',
							};
						}
						if (result.status === 'agent_misconfigured') {
							return {
								status: 'error',
								code: 'agent_misconfigured',
								message: "This agent isn't ready to run yet. Finish configuring it and try again.",
								missing: result.missing,
							};
						}
						if (result.status === 'completed') return result;

						const approvals = collectStandardApprovals(result);
						const firstApproval = approvals?.[0];
						if (firstApproval) {
							const { continuation, ...approval } = firstApproval;
							return await ctx.suspend(approval, { continuation });
						}

						const cancelled = await this.agentTestRunService.cancelSuspendedRuns({
							agentId,
							suspensions: result.suspensions,
							userId: user.id,
						});
						if (!cancelled) {
							return {
								status: 'error',
								code: 'cancellation_failed',
								message:
									'This test needs approval, but its suspended run could not be cancelled. Open Preview before continuing this session.',
								sessionId: result.sessionId,
								previewPath,
							};
						}

						return {
							status: 'approval_required',
							response: result.response,
							sessionId: result.sessionId,
							...(result.executionId ? { executionId: result.executionId } : {}),
							suspensions: result.suspensions.map(({ runId, toolCallId, toolName }) => ({
								runId,
								toolCallId,
								toolName,
							})),
							previewPath,
						};
					} catch (error) {
						if (ctx.abortSignal ? ctx.abortSignal.aborted : isAbortError(error)) throw error;
						if (error instanceof InvalidAgentTestRunCheckpointError) {
							return {
								status: 'error',
								code: error.code,
								message: error.message,
							};
						}
						const { code, message } = describeCallAgentFailure(
							error instanceof Error ? error.message : 'Agent test run failed.',
						);
						return { status: 'error', code, message };
					}
				},
			)
			.build();

		const modelLookup: ModelLookup = {
			// `list` resolves the n8n Connect managed tag to the synthetic gateway
			// credential internally, so no managed branch is needed here.
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
			callAgentTool,
			buildResolveLlmTool({
				credentialProvider,
				modelLookup,
				isProviderServedByGateway: async (provider) => {
					try {
						return (
							(await this.aiGatewayService.getCredentialTypeForProvider(provider)) !== undefined
						);
					} catch {
						return false;
					}
				},
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
				credentialService,
				projectId,
				isCredentialTypeKnown: (credentialType) => this.credentialTypes.recognizes(credentialType),
				listIntegrationCredentialIds: async () => {
					const agent = await this.agentsService.findById(agentId, projectId);
					return (agent?.integrations ?? [])
						.filter((integration) => !isDraftIntegration(integration))
						.map((integration) => integration.credentialId);
				},
				track,
			}),
			buildAskEmbeddingCredentialTool({
				credentialService,
				projectId,
				isCredentialTypeKnown: (credentialType) => this.credentialTypes.recognizes(credentialType),
				isAssistantProxyEnabled: () => this.aiService.isProxyEnabled(),
				track,
			}),
			buildAskQuestionsTool({ track }),
			this.withConfigMutationMarker(
				buildConfigureChannelTool({
					agentId,
					projectId,
					listChatIntegrationTypes: () =>
						this.agentIntegrationPersistenceService
							.listChatIntegrations()
							.map((integration) => integration.type),
					track,
				}),
				agentId,
			),
			this.withConfigMutationMarker(
				buildFinishSetupTool({
					credentialService,
					agentId,
					projectId,
					track,
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
					listAiGatewayManagedCredentialTypes: async () => {
						const agent = await this.agentsService.findById(agentId, projectId);
						return listAiGatewayManagedCredentialTypes(agent?.schema?.tools, this.nodeTypes);
					},
				}),
				agentId,
			),
			buildVerifyMcpServerTool({
				agentId,
				credentialProvider,
				oauthService: this.oauthService,
				projectId,
				proxyFetch: createAiMcpFetch(this.outboundHttp),
				resolveRegistryConnection: async (nodeTypeName) =>
					await this.mcpRegistryService.getConnection(nodeTypeName),
				applyCredentialToMcpServer: async (serverName, credentialId) =>
					await this.applyCredentialToMcpServer(agentId, projectId, serverName, credentialId, user),
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
			.handler(async ({ code }: { code: string }, ctx) => {
				try {
					const descriptor = await this.secureRuntime.describeToolSecurely(code);
					const built = await this.agentCustomToolsService.buildCustomTool(
						agentId,
						projectId,
						code,
						descriptor,
						{ user, modifiedBy: 'builder' },
					);
					return { ok: true, id: built.id, name: descriptor.name };
				} catch (e) {
					// Unlike its sibling handlers, this one runs long isolate work, so an
					// abort can land mid-call and must not be reported as a build error.
					// When a signal is present it is the authority: the isolate compiles
					// model-authored code, so a generated tool throwing `Aborted` must not
					// be mistaken for a cancellation and kill the whole builder run.
					if (ctx.abortSignal ? ctx.abortSignal.aborted : isAbortError(e)) throw e;
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
					const created = await this.agentSkillsService.createSkills(agentId, projectId, skills, {
						user,
						modifiedBy: 'builder',
					});
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

		const readSkillTool = new Tool(BUILDER_TOOLS.READ_SKILL)
			.description(
				'Read an existing target-agent skill by id. The response includes its instructions, but ' +
					'references are returned as { path, sizeBytes } metadata by default to keep context small. ' +
					'Pass only the referencePaths whose content you need. Returns { ok: true, id, skill } or ' +
					'{ ok: false, errors }.',
			)
			.input(readSkillInputSchema)
			.handler(async ({ skillId, referencePaths = [] }: ReadSkillInput) => {
				try {
					const skill = await this.agentSkillsService.getSkill(agentId, projectId, skillId);
					const { references, ...body } = skill;
					const requestedPaths = new Set(referencePaths);
					const knownPaths = new Set(references?.map((reference) => reference.path) ?? []);
					const missingPaths = referencePaths.filter((path) => !knownPaths.has(path));
					if (missingPaths.length > 0) {
						return {
							ok: false,
							errors: [
								{
									message: `Reference path${missingPaths.length === 1 ? '' : 's'} not found: ${missingPaths.join(', ')}`,
								},
							],
						};
					}

					return {
						ok: true,
						id: skillId,
						skill: {
							...body,
							...(references
								? {
										references: references.map((reference) => ({
											path: reference.path,
											sizeBytes: new TextEncoder().encode(reference.content).byteLength,
											...(requestedPaths.has(reference.path) ? { content: reference.content } : {}),
										})),
									}
								: {}),
						},
					};
				} catch (e) {
					return {
						ok: false,
						errors: [{ message: e instanceof Error ? e.message : String(e) }],
					};
				}
			})
			.build();

		const listSkillsTool = new Tool(BUILDER_TOOLS.LIST_SKILLS)
			.description(
				'List lightweight metadata for persisted target-agent skills. Use this to identify which ' +
					'existing skill owns a capability before reading or creating a skill. Returns ' +
					'{ ok: true, skills: [{ id, name, description }] } or { ok: false, errors }.',
			)
			.input(z.object({}).strict())
			.handler(async () => {
				try {
					const skills = await this.agentSkillsService.listSkills(agentId, projectId);
					return {
						ok: true,
						skills: Object.entries(skills).map(([id, skill]) => ({
							id,
							name: skill.name,
							description: skill.description,
						})),
					};
				} catch (e) {
					return {
						ok: false,
						errors: [{ message: e instanceof Error ? e.message : String(e) }],
					};
				}
			})
			.build();

		const updateSkillTool = new Tool(BUILDER_TOOLS.UPDATE_SKILL)
			.description(
				'Update selected fields of an existing target-agent skill in place, preserving its id and ' +
					'agent config reference. Pass null for allowedTools to remove the tool restriction, or null ' +
					'for references to remove all references; empty arrays are invalid. Returns ' +
					'{ ok: true, id, name, configMutated: true, agentId } or { ok: false, errors }.',
			)
			.input(updateSkillInputSchema)
			.handler(async ({ skillId, updates }: UpdateSkillInput) => {
				const { allowedTools, references, ...requiredUpdates } = updates;
				const normalizedUpdates = {
					...requiredUpdates,
					...(allowedTools !== undefined ? { allowedTools: allowedTools ?? undefined } : {}),
					...(references !== undefined ? { references: references ?? undefined } : {}),
				};

				try {
					const updated = await this.agentSkillsService.updateSkill(
						agentId,
						projectId,
						skillId,
						normalizedUpdates,
						{ user, modifiedBy: 'builder' },
					);
					return { ok: true, id: updated.id, name: updated.skill.name };
				} catch (e) {
					return {
						ok: false,
						errors: [{ message: e instanceof Error ? e.message : String(e) }],
					};
				}
			})
			.build();

		const listTasksTool = new Tool(BUILDER_TOOLS.LIST_TASKS)
			.description(
				'List the target agent scheduled tasks, including each persisted body and whether its ' +
					'current config reference is enabled. Use this to identify a task before updating it. Returns ' +
					'{ ok: true, tasks: [{ id, name, objective, cronExpression, timezone, enabled }] } or ' +
					'{ ok: false, errors }.',
			)
			.input(z.object({}).strict())
			.handler(async () => {
				try {
					const agent = await this.agentsService.findById(agentId, projectId);
					if (!agent) throw new Error('Agent not found');

					const tasks = await this.agentTaskService.list(agentId);
					const enabledByTaskId = new Map(
						(composeJsonConfig(agent)?.tasks ?? []).map((task) => [task.id, task.enabled]),
					);
					return {
						ok: true,
						tasks: tasks.map(({ id, name, objective, cronExpression, timezone }) => ({
							id,
							name,
							objective,
							cronExpression,
							// Null means the task runs on the instance timezone.
							timezone,
							enabled: enabledByTaskId.get(id) ?? false,
						})),
					};
				} catch (e) {
					return {
						ok: false,
						errors: [{ message: e instanceof Error ? e.message : String(e) }],
					};
				}
			})
			.build();

		const updateTaskTool = new Tool(BUILDER_TOOLS.UPDATE_TASK)
			.description(
				'Update selected body fields of an existing target-agent scheduled task in place, preserving ' +
					'its id and config reference. Returns { ok: true, id, name, configMutated: true, agentId } ' +
					'or { ok: false, errors }.',
			)
			.input(updateTaskInputSchema)
			.handler(async ({ taskId, updates }: UpdateTaskInput) => {
				try {
					const updated = await this.agentTaskService.update(agentId, projectId, taskId, updates, {
						user,
						modifiedBy: 'builder',
					});
					return { ok: true, id: updated.id, name: updated.name };
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
					'section filled in with concrete, run-specific content. Agent Instructions still apply and ' +
					'configured Skills remain available during scheduled runs, so never repeat universal rules or ' +
					"copy reusable procedures into an objective. If anything is ambiguous, derive it from the user's goal as " +
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
								timezone: agentTaskSchema.shape.timezone.describe(
									'IANA timezone the cron runs in, e.g. "Europe/London". Set it when the user names a timezone or a location; omit it to use the instance timezone.',
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
					tasks: Array<{
						name: string;
						objective: string;
						cronExpression: string;
						timezone?: string | null;
					}>;
				}) => {
					// Each task is already validated against `.input()` (agentTaskSchema
					// shapes) by the tool runtime before the handler runs.
					let created: Awaited<ReturnType<AgentTaskService['createTasks']>>;
					try {
						// Adds a `{ type:'task', id, enabled }` ref per task to the agent config
						// and creates every body in one transaction. Enabled by default; each
						// task starts running once the agent is (re)published via publish_agent.
						created = await this.agentTaskService.createTasks(
							agentId,
							projectId,
							tasks.map((task) => ({ ...task, enabled: true })),
							{ user, modifiedBy: 'builder' },
						);
					} catch (e) {
						return {
							ok: false,
							errors: [{ message: e instanceof Error ? e.message : String(e) }],
						};
					}

					return {
						ok: true,
						tasks: created.map(({ id, name }) => ({ id, name, enabled: true as const })),
					};
				},
			)
			.build();

		const listWorkflowsTool = new Tool(BUILDER_TOOLS.LIST_WORKFLOWS)
			.description(
				'List the n8n workflows that can be attached as tools via `type: "workflow"` in the agent config. ' +
					"Only returns workflows that start with a 'When Executed by Another Workflow' trigger. " +
					'`active: false` means the workflow is not published; the published agent cannot call it until it is. ' +
					'Pass `searchTerm` to narrow by workflow name; ' +
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
			listSkillsTool,
			readSkillTool,
			this.withConfigMutationMarker(updateSkillTool, agentId),
			this.withConfigMutationMarker(createTasksTool, agentId),
			listTasksTool,
			this.withConfigMutationMarker(updateTaskTool, agentId),
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
		user: User,
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

		await this.agentConfigService.updateConfig(agentId, projectId, configWithDefaults, user, {
			modifiedBy: 'builder',
		});
		return { applied: true };
	}
}
