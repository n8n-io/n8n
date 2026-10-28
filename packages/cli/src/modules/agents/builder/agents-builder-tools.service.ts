import { isRecord } from '@n8n/utils/is-record';
import {
	isAbortError,
	type BuiltTool,
	type CredentialProvider,
	type InterruptibleToolContext,
	type JSONValue,
	type ToolContext,
	type ToolSuspendOptions,
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
	getModelPromptCachingCapability,
	rejectIfDynamicSelectorUsesFromAi,
	rejectIfEmptyInstructions,
	rejectIfUnsupportedNativeWebSearch,
	type AgentConfigValidationMessages,
} from '@n8n/ai-utilities/agent-config';
import {
	agentSkillSchema,
	agentTaskSchema,
	formatZodErrors,
	resolvePromptCaching,
	AgentJsonConfigSchema,
	isDraftAgentConfig,
	isDraftIntegration,
	isCredentialAgentIntegration,
	sanitizeAgentJsonConfig,
	tryParseConfigJson,
	type AgentJsonConfig,
	type ConfigValidationError,
	getLegacyBuilderToolNames,
} from '@n8n/api-types';
import { OutboundHttp } from '@n8n/backend-network';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import type { BuilderCredentialService, BuilderToolsOptions } from './builder-session';
import { runInBuilderTelemetrySession } from './builder-telemetry-session';
import type { Operation } from 'fast-json-patch';
import { z } from 'zod';

import { CredentialTypes } from '@/credential-types';
import { CollaborationService } from '@/collaboration/collaboration.service';
import { ConflictError, LockedError, UnexpectedError } from '@n8n/errors';
import { McpRegistryService } from '@/modules/mcp-registry/registry/mcp-registry.service';
import { NodeTypes } from '@/node-types';
import { OauthService } from '@/oauth/oauth.service';
import { userHasScopes } from '@/permissions.ee/check-access';
import { AiGatewayService } from '@/services/ai-gateway.service';
import { AiService } from '@/services/ai.service';
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
import { AgentsService } from '../agents.service';
import type { BuilderTrackFn } from './builder-config-telemetry';
import { buildAgentPreviewPath } from './agent-builder-preview-path';
import { describeCallAgentFailure } from './call-agent-failure';
import { BuilderModelLiveLookupService } from './builder-model-live-lookup.service';
import { BUILDER_TOOLS } from './builder-tool-names';
import {
	buildAskQuestionsTool,
	buildConfigureChannelTool,
	buildFinishSetupTool,
	buildResolveLlmTool,
} from './interactive';
import type {
	FinishSetupConfigApplyResult,
	FinishSetupConfigWrites,
} from './interactive/finish-setup.tool';
import type { ModelLookup } from './interactive/resolve-llm.tool';
import { objectiveTemplateGaps } from './task-objective-template';
import { buildVerifyMcpServerTool, type McpCredentialApplyResult } from './verify-mcp-server.tool';
import { AgentSkillRefsService } from '../agent-skill-refs.service';
import { composeJsonConfig } from '../json-config/agent-config-composition';
import {
	assignCredentialToNodeTools,
	listAiGatewayManagedCredentialTypes,
} from '../json-config/reconcile-node-tool-gateway-credentials';
import { AgentSecureRuntime } from '../runtime/agent-secure-runtime';
import { getAgentConfigHash, isSameAgentConfig } from '../utils/agent-config-hash';
import {
	SkillNameTakenError,
	skillNameTakenToolMessage,
} from '@/modules/skills/skill-name-taken.error';

const STALE_CONFIG_ERROR: ConfigValidationError = {
	path: '(root)',
	message:
		'Agent config changed elsewhere. This result carries the current config and configHash: ' +
		're-apply your change to that config and retry once with that configHash.',
};

const BASE_CONFIG_HASH_RULE =
	'Pass baseConfigHash as the Config freshness rules of the agent-builder skill say. ' +
	'Results that need an action carry `nextStep`: follow it.';

const BASE_CONFIG_HASH_FIELD_DESCRIPTION =
	'configHash of your latest config read or write; null only when no config exists';

/**
 * Models sometimes still send a structured argument as a JSON string. Parse it
 * so the schema sees the value, and keep it unchanged when it is not valid JSON.
 */
function configuredTriggerTypes(config: AgentJsonConfig | null): Set<string> {
	return new Set(
		(config?.integrations ?? [])
			// Legacy schedule rows in a stored config have no credentialId and are not channels.
			.filter(
				(integration) =>
					typeof integration.credentialId === 'string' && !isDraftIntegration(integration),
			)
			.map((integration) => integration.type),
	);
}

/** Reports each configured channel type that a builder config save dropped. */
function trackRemovedTriggers(
	track: BuilderTrackFn,
	previous: AgentJsonConfig | null,
	next: AgentJsonConfig,
): void {
	const remaining = configuredTriggerTypes(next);
	const triggers = [...remaining].sort();
	for (const type of configuredTriggerTypes(previous)) {
		if (remaining.has(type)) continue;
		track(TELEMETRY_EVENT.AGENTS.BUILDER_REMOVED_TRIGGER, { trigger_type: type, triggers });
	}
}

function parseJsonStringInput(value: unknown): unknown {
	if (typeof value !== 'string') return value;
	const parsed = tryParseConfigJson(value);
	return parsed.ok ? parsed.data : value;
}

/**
 * `agent_builder_write_config` arguments are objects so the model does not have to escape
 * every quote. A JSON string is still accepted, as older tool calls sent one.
 */
function readStructuredToolInput(
	value: unknown,
): { ok: true; data: unknown } | { ok: false; errors: ConfigValidationError[] } {
	return typeof value === 'string' ? tryParseConfigJson(value) : { ok: true, data: value };
}

/**
 * `agent_builder_write_config` keeps every top-level field the model omits. Merge the stored
 * value before validation, so builder defaults (web search, prompt caching)
 * see the real stored state instead of an empty field.
 */
function mergeOmittedTopLevelFields(submitted: unknown, stored: AgentJsonConfig | null): unknown {
	if (!stored || !isRecord(submitted)) return submitted;
	return { ...stored, ...submitted };
}

/**
 * Before `config`, `agent_builder_write_config` took the config as a `json` string. Map that
 * key so a checkpoint resumed after a deploy can still run a pending call.
 * The model only sees the `config` key in the tool schema.
 */
function renameLegacyWriteConfigKey(value: unknown): unknown {
	if (!isRecord(value) || value.config !== undefined || value.json === undefined) return value;
	const { json, ...rest } = value;
	return { ...rest, config: json };
}

const jsonPatchOperationSchema = z.object({
	op: z.enum(['add', 'remove', 'replace', 'move', 'copy', 'test']),
	path: z.string().describe('JSON Pointer, e.g. "/instructions" or "/tools/-"'),
	from: z.string().optional().describe('Source JSON Pointer for move and copy'),
	value: z.unknown().optional().describe('New value for add, replace, and test'),
});

const AGENT_LOCKED_BY_EDITOR_ERROR: ConfigValidationError = {
	path: '(root)',
	message:
		'The agent is being edited by a user in the n8n builder right now, so it cannot be modified. ' +
		'Stop editing and tell the user to finish or close their editing session, then retry.',
};

type EditorLockFailure = { ok: false; errors: ConfigValidationError[] };

/**
 * What the model must do with a config write result. Stale and locked failures
 * carry their own instructions in the error message.
 */
function configWriteNextStep(result: Record<string, unknown>): string | undefined {
	if (result.ok === true) {
		return result.config === undefined
			? undefined
			: 'The saved config differs from what you sent. Treat `config` as the current state.';
	}
	if (result.ok !== false || result.stage === 'stale' || result.stage === 'locked')
		return undefined;
	const errors = Array.isArray(result.errors) ? result.errors : [];
	const locked = errors.some(
		(error) => isRecord(error) && error.message === AGENT_LOCKED_BY_EDITOR_ERROR.message,
	);
	return locked
		? undefined
		: 'Nothing was saved. Fix the payload and retry with the same baseConfigHash.';
}

function withConfigWriteNextStep(result: unknown): unknown {
	if (!isRecord(result)) return result;
	const nextStep = configWriteNextStep(result);
	return nextStep ? { ...result, nextStep } : result;
}

const STALE_SKILL_ERROR_MESSAGE =
	'Skill changed. Call agent-context with type "skill", then retry with its skill and skillHash.';

/** Asks for a fix when a saved task objective does not follow the objective template. */
function incompleteObjectivesNextStep(
	tasks: Array<{ name: string; objective: string }>,
): string | undefined {
	const gaps = tasks.flatMap(({ name, objective }) => {
		const objectiveGaps = objectiveTemplateGaps(objective);
		return objectiveGaps.length > 0 ? [`"${name}" (${objectiveGaps.join(', ')})`] : [];
	});
	if (gaps.length === 0) return undefined;
	return (
		`These objectives do not follow the template: ${gaps.join('; ')}. Load ` +
		`agent-builder-target-tasks and replace each objective with ${BUILDER_TOOLS.UPDATE_TASK}.`
	);
}

/** A taken name is a conflict too, but a retry with a fresh hash would fail the same way. */
function updateSkillErrorMessage(error: unknown, message: string): string {
	if (error instanceof SkillNameTakenError) return skillNameTakenToolMessage(error.skillName);
	return error instanceof ConflictError ? STALE_SKILL_ERROR_MESSAGE : message;
}

function isEmptyConfigValue(value: unknown): boolean {
	return value === undefined || value === null || (typeof value === 'string' && !value.trim());
}

/** LLM-facing follow-up guidance for this builder surface (CLI skill-based tools). */
const CLI_AGENT_CONFIG_MESSAGES: AgentConfigValidationMessages = {
	emptyInstructionsFollowUp: 'saving the config again.',
	dynamicSelectorFollowUp:
		'Load skill agent-builder-resource-locators, resolve a credential if missing, then call ' +
		'get_node_parameter_options and write the returned parameterValue into nodeParameters.',
};

const createSkillInputSchema = z
	.object({
		name: agentSkillSchema.shape.name.describe('Must be unique in the project'),
		description: agentSkillSchema.shape.description.describe('Routing contract'),
		instructions: agentSkillSchema.shape.instructions.describe('Body in the template'),
		references: agentSkillSchema.shape.references
			.optional()
			.describe('Markdown files under references/'),
	})
	.strict();

type CreateSkillInput = z.infer<typeof createSkillInputSchema>;

const updateSkillFieldsSchema = z
	.object({
		name: agentSkillSchema.shape.name.optional(),
		description: agentSkillSchema.shape.description.optional(),
		instructions: agentSkillSchema.shape.instructions
			.optional()
			.describe('Complete replacement body'),
		instructionEdits: z
			.array(
				z
					.object({
						oldText: z.string().min(1).describe('Exact text that matches one place'),
						newText: z.string().describe('Empty string deletes'),
					})
					.strict(),
			)
			.min(1)
			.max(20)
			.optional()
			.describe('Partial body edits, applied in order. Do not pass with `instructions`.'),
		references: agentSkillSchema.shape.references
			.unwrap()
			.refine((references) => references.length > 0, 'Pass null to clear references.')
			.nullable()
			.optional(),
	})
	.strict()
	.refine((updates) => Object.keys(updates).length > 0, {
		message: 'At least one skill field must be supplied.',
	})
	.refine((updates) => !(updates.instructions && updates.instructionEdits), {
		message: 'Pass either instructions or instructionEdits, not both.',
	});

const updateSkillInputSchema = z
	.object({
		skillId: z.string().min(1),
		baseSkillHash: z
			.string()
			.min(1)
			.describe('skillHash from the preceding agent-context type "skill" result'),
		updates: updateSkillFieldsSchema.describe(
			'Only the fields to change. Pass null for references to remove them.',
		),
	})
	.strict();

type UpdateSkillInput = z.infer<typeof updateSkillInputSchema>;

const updateTaskFieldsSchema = z
	.object({
		name: agentTaskSchema.shape.name.optional(),
		objective: agentTaskSchema.shape.objective
			.optional()
			.describe('Complete replacement objective'),
		cronExpression: agentTaskSchema.shape.cronExpression.optional(),
		timezone: agentTaskSchema.shape.timezone.describe('Pass null for the instance timezone'),
	})
	.strict()
	.refine((updates) => Object.keys(updates).length > 0, {
		message: 'At least one task field must be supplied.',
	});

const updateTaskInputSchema = z
	.object({
		taskId: z.string().min(1),
		updates: updateTaskFieldsSchema.describe('Only the fields to change'),
	})
	.strict();

type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;

/** A agent_builder_call_agent continuation that carries a sessionNote across an approval. */
const notedContinuationSchema = z.object({ run: z.unknown(), sessionNote: z.string() }).strict();

type BuilderConfigFailure = {
	ok: false;
	stage?: 'parse' | 'stale' | 'patch' | 'schema';
	errors: ConfigValidationError[];
	config?: AgentJsonConfig | null;
	configHash?: string | null;
};

/** `config` is set only when the saved config differs from what the model sent. */
type BuilderConfigSuccess = {
	ok: true;
	configHash: string;
	config?: AgentJsonConfig;
};

interface AgentConfigSnapshot {
	config: AgentJsonConfig | null;
	configHash: string | null;
}

/** Placeholder agent id for the tool set that only supplies tool definitions. */
const UNRESOLVED_TARGET_AGENT_ID = '';

/**
 * Continuation of a builder tool that suspended for a per-call target. It pins
 * the agent the call started on, and wraps the tool's own continuation.
 */
const pinnedTargetContinuationSchema = z
	.object({
		builderTargetAgentId: z.string().min(1),
		inner: z.custom<JSONValue>().optional(),
	})
	.strict();

function isInterruptibleContext(
	ctx: ToolContext | InterruptibleToolContext,
): ctx is InterruptibleToolContext {
	return 'suspend' in ctx && typeof ctx.suspend === 'function';
}

/**
 * Pin `agentId` on every suspension of the call, so its resume targets the same
 * agent. The tool sees only its own continuation.
 */
function withPinnedTarget(
	ctx: InterruptibleToolContext,
	agentId: string,
	innerContinuation: JSONValue | undefined,
): InterruptibleToolContext {
	return {
		...ctx,
		continuation: innerContinuation,
		suspend: async (payload: unknown, options?: ToolSuspendOptions) => {
			const inner =
				options && Object.prototype.hasOwnProperty.call(options, 'continuation')
					? options.continuation
					: innerContinuation;
			return await ctx.suspend(payload, {
				...options,
				continuation: {
					builderTargetAgentId: agentId,
					...(inner !== undefined ? { inner } : {}),
				},
			});
		},
	};
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

/** Enable caching for supported models and preserve an explicit cache TTL. */
function applyPromptCachingBuilderDefaults(config: AgentJsonConfig): AgentJsonConfig {
	const capability = getModelPromptCachingCapability(config.model);
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
const FRESH_AGENT_MEMORY: NonNullable<AgentJsonConfig['memory']> = {
	enabled: true,
	storage: 'n8n',
	observationalMemory: { enabled: true },
};

/**
 * A fresh Agent (no stored instructions yet) gets n8n session memory unless the
 * write sets memory itself. Existing Agents keep what they have, so an Agent
 * that was saved without memory is not changed by a later edit.
 */
function applyFreshAgentMemoryDefault(
	config: AgentJsonConfig,
	currentConfig: AgentJsonConfig | null,
): AgentJsonConfig {
	const isFresh = !currentConfig?.instructions?.trim();
	if (!isFresh || config.memory !== undefined) return config;
	return { ...config, memory: FRESH_AGENT_MEMORY };
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
		private readonly nodeTypes: NodeTypes,
		private readonly freeAiCreditsService: FreeAiCreditsService,
		private readonly telemetry: Telemetry,
		private readonly collaborationService: CollaborationService,
		private readonly agentSkillRefs: AgentSkillRefsService,
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
						('completed' in result && result.completed === true)) &&
					(!('changed' in result) || result.changed !== false)
				) {
					return { ...result, configMutated: true, agentId };
				}
				return result;
			},
		};
	}

	/**
	 * The user can change the config while an interactive tool waits, so a
	 * resumed final result carries a fresh snapshot. `isFinal` must reject
	 * suspend results.
	 */
	private withConfigSnapshotOnResume(
		tool: BuiltTool,
		agentId: string,
		projectId: string,
		isFinal: (result: Record<string, unknown>) => boolean,
	): BuiltTool {
		const handler = tool.handler;
		if (!handler) return tool;
		return {
			...tool,
			handler: async (input, ctx) => {
				const result = await handler(input, ctx);
				const resumed =
					'resumeData' in ctx && ctx.resumeData !== undefined && ctx.resumeData !== null;
				if (!resumed || !isRecord(result) || !isFinal(result)) return result;
				const snapshot = await this.getConfigSnapshot(agentId, projectId).catch(() => null);
				return snapshot ? { ...result, ...snapshot } : result;
			},
		};
	}

	/**
	 * Returns a `{ ok: false, errors }` tool result while a user holds the
	 * agent's builder write lock, or null when the agent can be modified.
	 * Every mutating tool returns this shape on failure, so the model gets one
	 * consistent signal to stop and ask the user to close their editing session.
	 */
	private async getEditorLockFailure(agentId: string): Promise<EditorLockFailure | null> {
		try {
			await this.collaborationService.ensureAgentEditable(agentId);
			return null;
		} catch (error) {
			if (error instanceof LockedError) {
				return { ok: false, errors: [AGENT_LOCKED_BY_EDITOR_ERROR] };
			}
			throw error;
		}
	}

	getTools(
		agentId: string,
		projectId: string,
		credentialProvider: CredentialProvider,
		credentialService: BuilderCredentialService,
		user: User,
		options?: BuilderToolsOptions,
	): BuilderTools {
		return {
			json: this.getJsonTools(
				agentId,
				projectId,
				credentialProvider,
				credentialService,
				user,
				options,
			),
			shared: this.getSharedTools(agentId, projectId, user),
		};
	}

	/**
	 * Builder tools for a host that selects the target agent per call. Each
	 * handler resolves the target when it runs, then delegates to the tool built
	 * for that agent. Tool names, schemas, and descriptions do not depend on the
	 * agent, so a tool set built for a placeholder id supplies them.
	 *
	 * A suspended call keeps its agent: the host can select another agent while
	 * the call waits, so the resume passes the pinned id to the resolver.
	 */
	getToolsForResolvedTarget(
		resolveTargetAgentId: (pinnedAgentId?: string) => Promise<string>,
		projectId: string,
		credentialProviderFor: (agentId: string) => CredentialProvider,
		credentialService: BuilderCredentialService,
		user: User,
		options: BuilderToolsOptions = {},
	): BuiltTool[] {
		const buildToolSet = (agentId: string, credentialProvider: CredentialProvider) => {
			const { json, shared } = this.getTools(
				agentId,
				projectId,
				credentialProvider,
				credentialService,
				user,
				options,
			);
			return [...json, ...shared];
		};

		const toolSetsByAgentId = new Map<string, Map<string, BuiltTool>>();
		const toolFor = (agentId: string, toolName: string): BuiltTool | undefined => {
			let toolSet = toolSetsByAgentId.get(agentId);
			if (!toolSet) {
				toolSet = new Map(
					buildToolSet(agentId, credentialProviderFor(agentId)).map((tool) => [tool.name, tool]),
				);
				toolSetsByAgentId.set(agentId, toolSet);
			}
			return toolSet.get(toolName);
		};

		const unresolvedTarget = async (): Promise<never> => {
			throw new UnexpectedError('Builder credentials require a resolved target agent.');
		};
		const templates = buildToolSet(UNRESOLVED_TARGET_AGENT_ID, {
			resolve: unresolvedTarget,
			list: unresolvedTarget,
		});
		return templates.map((template) => ({
			...template,
			handler: async (input, ctx) => {
				const pinned = isInterruptibleContext(ctx)
					? pinnedTargetContinuationSchema.safeParse(ctx.continuation)
					: undefined;
				const pinnedTarget = pinned?.success ? pinned.data : undefined;
				const agentId = await resolveTargetAgentId(pinnedTarget?.builderTargetAgentId);
				const handler = toolFor(agentId, template.name)?.handler;
				if (!handler) throw new UnexpectedError(`Builder tool "${template.name}" has no handler`);
				return await runInBuilderTelemetrySession(options.session, async () => {
					if (!isInterruptibleContext(ctx)) return await handler(input, ctx);
					const innerContinuation = pinnedTarget ? pinnedTarget.inner : ctx.continuation;
					return await handler(input, withPinnedTarget(ctx, agentId, innerContinuation));
				});
			},
		}));
	}

	private getJsonTools(
		agentId: string,
		projectId: string,
		credentialProvider: CredentialProvider,
		credentialService: BuilderCredentialService,
		user: User,
		options?: BuilderToolsOptions,
	): BuiltTool[] {
		const track: BuilderTrackFn = (entry, properties) => {
			const enriched = {
				agent_id: agentId,
				user_id: user.id,
				...properties,
			};
			if (options?.track) {
				options.track(entry, enriched);
				return;
			}
			this.telemetry.track(entry, enriched);
		};
		const writeConfigTool = this.buildWriteConfigTool(agentId, projectId, user, track);
		const patchConfigTool = this.buildPatchConfigTool(agentId, projectId, user, track);
		const publishAgentTool = this.buildPublishAgentTool(user, projectId, agentId);
		const unpublishAgentTool = this.buildUnpublishAgentTool(user, projectId, agentId);
		const callAgentTool = this.buildCallAgentTool(user, projectId, agentId, credentialProvider);
		const modelLookup = this.createModelLookup(user, projectId, options);
		const tools: BuiltTool[] = [
			this.withConfigMutationMarker(writeConfigTool, agentId),
			this.withConfigMutationMarker(patchConfigTool, agentId),
			this.withConfigMutationMarker(publishAgentTool, agentId),
			this.withConfigMutationMarker(unpublishAgentTool, agentId),
			callAgentTool,
			this.createLlmTool(credentialProvider, modelLookup, user, projectId),
			buildAskQuestionsTool({ track }),
			this.withConfigMutationMarker(
				this.withConfigSnapshotOnResume(
					this.createConfigureChannelTool(agentId, projectId, user, track),
					agentId,
					projectId,
					(result) => typeof result.configured === 'boolean',
				),
				agentId,
			),
			this.withConfigMutationMarker(
				this.withConfigSnapshotOnResume(
					this.createFinishSetupTool(credentialService, agentId, projectId, user, track),
					agentId,
					projectId,
					(result) => result.completed === true,
				),
				agentId,
			),
			this.createVerifyMcpServerTool(agentId, credentialProvider, projectId, user),
		];

		return tools;
	}

	private createVerifyMcpServerTool(
		agentId: string,
		credentialProvider: CredentialProvider,
		projectId: string,
		user: User,
	): BuiltTool {
		return buildVerifyMcpServerTool({
			agentId,
			credentialProvider,
			oauthService: this.oauthService,
			projectId,
			proxyFetch: createAiMcpFetch(this.outboundHttp),
			resolveRegistryConnection: async (nodeTypeName) =>
				await this.mcpRegistryService.getConnection(nodeTypeName),
			applyCredentialToMcpServer: async (serverName, credentialId) =>
				await this.applyCredentialToMcpServer(agentId, projectId, serverName, credentialId, user),
		});
	}

	private createFinishSetupTool(
		credentialService: BuilderCredentialService,
		agentId: string,
		projectId: string,
		user: User,
		track: BuilderTrackFn,
	): BuiltTool {
		return buildFinishSetupTool({
			credentialService,
			agentId,
			projectId,
			track,
			applySetupToConfig: async (writes) =>
				await this.applyFinishSetupToConfig(agentId, projectId, user, writes),
			isCredentialTypeKnown: (credentialType) => this.credentialTypes.recognizes(credentialType),
			listIntegrationCredentialIds: async () =>
				await this.listChannelCredentialIds(agentId, projectId),
			listChatIntegrationTypes: async () =>
				(await this.agentIntegrationPersistenceService.listBuilderChatIntegrations(user)).map(
					(integration) => integration.type,
				),
			listAiGatewayManagedCredentialTypes: async () => {
				const agent = await this.agentsService.findById(agentId, projectId);
				return listAiGatewayManagedCredentialTypes(agent?.schema?.tools, this.nodeTypes);
			},
		});
	}

	private createConfigureChannelTool(
		agentId: string,
		projectId: string,
		user: User,
		track: BuilderTrackFn,
	): BuiltTool {
		return buildConfigureChannelTool({
			agentId,
			projectId,
			listChatIntegrationTypes: async () =>
				(await this.agentIntegrationPersistenceService.listBuilderChatIntegrations(user)).map(
					(integration) => integration.type,
				),
			track,
		});
	}

	async getCredentialDefaults(agentId: string, projectId: string) {
		return {
			channelCredentialIds: await this.listChannelCredentialIds(agentId, projectId),
			managedCredentialAvailable: this.aiService.isProxyEnabled(),
		};
	}

	private async listChannelCredentialIds(agentId: string, projectId: string): Promise<string[]> {
		const agent = await this.agentsService.findById(agentId, projectId);
		return (agent?.integrations ?? [])
			.filter(
				(integration) =>
					isCredentialAgentIntegration(integration) && !isDraftIntegration(integration),
			)
			.map((integration) => integration.credentialId);
	}

	private createLlmTool(
		credentialProvider: CredentialProvider,
		modelLookup: ModelLookup,
		user: User,
		projectId: string,
	): BuiltTool {
		return buildResolveLlmTool({
			credentialProvider,
			modelLookup,
			isProviderServedByGateway: async (provider) => {
				try {
					return (await this.aiGatewayService.getCredentialTypeForProvider(provider)) !== undefined;
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
		});
	}

	private buildCallAgentTool(
		user: User,
		projectId: string,
		agentId: string,
		credentialProvider: CredentialProvider,
	) {
		return new Tool(BUILDER_TOOLS.CALL_AGENT)
			.legacyNames(...getLegacyBuilderToolNames(BUILDER_TOOLS.CALL_AGENT))
			.description(
				'Call it only when the user reports a problem with the agent, to reproduce it and ' +
					'confirm the fix; not by default after a build. Tests the draft agent in the built-in ' +
					'Preview chat, not channel integrations (triggers, platform context, delivery, or ' +
					'replies). It runs the real configured tools and credentials, so external side ' +
					'effects are possible. Omit sessionId to start a new conversation. To continue one, ' +
					'pass the exact sessionId from an earlier result; never make one up. An unknown ' +
					'sessionId starts a new conversation and the result has a sessionNote. Standard tool ' +
					'approvals pause the test until the user decides in chat. Unsupported interactive ' +
					'requests return approval_required with a Preview path.',
			)
			.input(
				z.object({
					message: z.string().trim().min(1),
					sessionId: z.string().trim().optional(),
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
						const { result, sessionNote } = await this.runDraftTest(
							ctx,
							agentId,
							projectId,
							message,
							sessionId || undefined,
							credentialProvider,
							user,
						);

						return await this.formatDraftTestResult(
							result,
							ctx,
							agentId,
							user,
							previewPath,
							sessionNote,
						);
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
	}

	private async runDraftTest(
		ctx: InterruptibleToolContext<ApprovalSuspendPayload, ApprovalResumePayload>,
		agentId: string,
		projectId: string,
		message: string,
		sessionId: string | undefined,
		credentialProvider: CredentialProvider,
		user: User,
	): Promise<{ result: AgentTestRunResult; sessionNote?: string }> {
		if (ctx.resumeData === undefined) {
			const execute = async (id: string | undefined) =>
				await this.agentTestRunService.executeDraftRun({
					agentId,
					projectId,
					message,
					sessionId: id,
					credentialProvider,
					user,
					source: 'instance-ai',
					...(ctx.abortSignal ? { abortSignal: ctx.abortSignal } : {}),
				});
			const result = await execute(sessionId);
			// The session check runs before the agent, so a retry has no side effects.
			if (result.status !== 'session_not_found' || sessionId === undefined) return { result };
			return {
				result: await execute(undefined),
				sessionNote:
					'The sessionId you passed was not found, so this test started a new conversation. ' +
					'To continue this conversation, pass the sessionId from this result.',
			};
		}
		// A continuation without a note is the raw test-run continuation.
		const noted = notedContinuationSchema.safeParse(ctx.continuation);
		return {
			result: await this.agentTestRunService.resumeDraftApproval({
				agentId,
				projectId,
				continuation: noted.success ? noted.data.run : ctx.continuation,
				approved: ctx.resumeData.approved,
				user,
				source: 'instance-ai',
				...(ctx.abortSignal ? { abortSignal: ctx.abortSignal } : {}),
			}),
			...(noted.success ? { sessionNote: noted.data.sessionNote } : {}),
		};
	}

	private buildUnpublishAgentTool(user: User, projectId: string, agentId: string) {
		return new Tool(BUILDER_TOOLS.UNPUBLISH_AGENT)
			.legacyNames(...getLegacyBuilderToolNames(BUILDER_TOOLS.UNPUBLISH_AGENT))
			.description(
				'Unpublish the target agent: clear the live version but keep the draft, disconnect ' +
					'chat integrations, and stop scheduled tasks. Call it when the user asks to unpublish ' +
					'or take the agent offline.',
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
				const editorLock = await this.getEditorLockFailure(agentId);
				if (editorLock) return editorLock;
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
	}

	private buildPublishAgentTool(user: User, projectId: string, agentId: string) {
		return new Tool(BUILDER_TOOLS.PUBLISH_AGENT)
			.legacyNames(...getLegacyBuilderToolNames(BUILDER_TOOLS.PUBLISH_AGENT))
			.description(
				'Publish the target agent so it goes live: integrations sync and scheduled tasks ' +
					'start. Pass `versionId` to activate a history version instead of the draft. Call it ' +
					'only when the user asks to publish, activate, or make the agent live or usable. Never ' +
					'tell them to click Publish in the editor.',
			)
			.input(
				z.object({
					versionId: z.string().min(1).optional().describe('Omit to publish the draft'),
				}),
			)
			.handler(async ({ versionId }: { versionId?: string }) => {
				if (!(await userHasScopes(user, ['agent:publish'], false, { projectId }))) {
					return {
						ok: false,
						errors: [{ message: 'You do not have permission to publish agents in this project.' }],
					};
				}
				const editorLock = await this.getEditorLockFailure(agentId);
				if (editorLock) return editorLock;
				try {
					const before = await this.agentsService.findById(agentId, projectId);
					const beforeActiveVersionId = before?.activeVersionId;
					const beforeVersionId = before?.versionId;
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
						...(beforeActiveVersionId === agent.activeVersionId &&
						beforeVersionId === agent.versionId
							? { changed: false }
							: {}),
					};
				} catch (e) {
					return {
						ok: false,
						errors: [{ message: e instanceof Error ? e.message : String(e) }],
					};
				}
			})
			.build();
	}

	private buildPatchConfigTool(
		agentId: string,
		projectId: string,
		user: User,
		track: BuilderTrackFn,
	) {
		return new Tool(BUILDER_TOOLS.PATCH_CONFIG)
			.legacyNames(...getLegacyBuilderToolNames(BUILDER_TOOLS.PATCH_CONFIG))
			.description(
				'Apply RFC 6902 JSON Patch operations to the agent config. Pass `operations` as an ' +
					'array, not as a JSON string. ' +
					BASE_CONFIG_HASH_RULE,
			)
			.toModelOutput(withConfigWriteNextStep)
			.input(
				z.object({
					operations: z
						.preprocess(parseJsonStringInput, z.array(jsonPatchOperationSchema))
						.describe('RFC 6902 operations'),
					baseConfigHash: z.string().nullable().describe(BASE_CONFIG_HASH_FIELD_DESCRIPTION),
				}),
			)
			.handler(
				async ({
					operations,
					baseConfigHash,
				}: { operations: unknown; baseConfigHash: string | null }) =>
					await this.patchBuilderConfig(
						agentId,
						projectId,
						user,
						operations,
						baseConfigHash,
						track,
					),
			)
			.build();
	}

	private buildWriteConfigTool(
		agentId: string,
		projectId: string,
		user: User,
		track: BuilderTrackFn,
	) {
		return new Tool(BUILDER_TOOLS.WRITE_CONFIG)
			.legacyNames(...getLegacyBuilderToolNames(BUILDER_TOOLS.WRITE_CONFIG))
			.description(
				'Create or update the agent config. Pass `config` as an object, not as a JSON string, ' +
					'with only the top-level fields you set or change. An omitted field (including model ' +
					'and credential) keeps its stored value. A sent field replaces the stored field whole. ' +
					'A fresh agent needs name, model, and instructions. ' +
					BASE_CONFIG_HASH_RULE,
			)
			.toModelOutput(withConfigWriteNextStep)
			.input(
				z.preprocess(
					renameLegacyWriteConfigKey,
					z.object({
						config: z
							.preprocess(parseJsonStringInput, z.record(z.unknown()))
							.describe('Top-level fields to set'),
						baseConfigHash: z.string().nullable().describe(BASE_CONFIG_HASH_FIELD_DESCRIPTION),
					}),
				),
			)
			.handler(
				async ({ config, baseConfigHash }: { config: unknown; baseConfigHash: string | null }) =>
					await this.writeBuilderConfig(agentId, projectId, user, config, baseConfigHash, track),
			)
			.build();
	}

	private getSharedTools(agentId: string, projectId: string, user: User): BuiltTool[] {
		const buildCustomToolTool = this.buildCustomToolTool(agentId, projectId, user);
		const createSkillsTool = this.buildCreateSkillsTool(agentId, projectId, user);
		const updateSkillTool = this.buildUpdateSkillTool(agentId, projectId, user);
		const updateTaskTool = this.buildUpdateTaskTool(agentId, projectId, user);
		const createTasksTool = this.buildCreateTasksTool(agentId, projectId, user);

		return [
			this.withConfigMutationMarker(buildCustomToolTool, agentId),
			this.withConfigMutationMarker(createSkillsTool, agentId),
			this.withConfigMutationMarker(updateSkillTool, agentId),
			this.withConfigMutationMarker(createTasksTool, agentId),
			this.withConfigMutationMarker(updateTaskTool, agentId),
		];
	}

	private buildCreateTasksTool(agentId: string, projectId: string, user: User) {
		return new Tool(BUILDER_TOOLS.CREATE_TASKS)
			.legacyNames(...getLegacyBuilderToolNames(BUILDER_TOOLS.CREATE_TASKS))
			.description(
				'Create recurring scheduled tasks for the target agent. Load agent-builder-target-tasks ' +
					'first: it has the required objective template and the task rules. Pass every task you ' +
					'can write in one `tasks` array; the batch is all-or-nothing. Tasks run after the next ' +
					'agent_builder_publish_agent.',
			)
			.input(
				z.object({
					tasks: z
						.array(
							z.object({
								name: agentTaskSchema.shape.name,
								objective: agentTaskSchema.shape.objective.describe('Objective in the template'),
								cronExpression: agentTaskSchema.shape.cronExpression,
								timezone: agentTaskSchema.shape.timezone.describe(
									'Set when the user names a timezone or location',
								),
							}),
						)
						.min(1)
						.max(20),
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
					const editorLock = await this.getEditorLockFailure(agentId);
					if (editorLock) return editorLock;
					let created: Awaited<ReturnType<AgentTaskService['createTasks']>>;
					try {
						// Adds a `{ type:'task', id, enabled }` ref per task to the agent config
						// and creates every body in one transaction. Enabled by default; each
						// task starts running once the agent is (re)published via agent_builder_publish_agent.
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

					const nextStep = incompleteObjectivesNextStep(tasks);
					return {
						ok: true,
						configHash: created.configHash,
						tasks: created.tasks.map(({ id, name }) => ({ id, name, enabled: true as const })),
						...(nextStep ? { nextStep } : {}),
					};
				},
			)
			.build();
	}

	private buildUpdateTaskTool(agentId: string, projectId: string, user: User) {
		return new Tool(BUILDER_TOOLS.UPDATE_TASK)
			.legacyNames(...getLegacyBuilderToolNames(BUILDER_TOOLS.UPDATE_TASK))
			.description(
				'Update fields of an existing target-agent task in place. It keeps the task id and config ' +
					'ref. Load agent-builder-target-tasks before you replace an objective.',
			)
			.input(updateTaskInputSchema)
			.handler(async ({ taskId, updates }: UpdateTaskInput) => {
				const editorLock = await this.getEditorLockFailure(agentId);
				if (editorLock) return editorLock;
				try {
					const { task, changed } = await this.agentTaskService.updateWithChange(
						agentId,
						projectId,
						taskId,
						updates,
						{
							user,
							modifiedBy: 'builder',
						},
					);
					const nextStep =
						updates.objective === undefined
							? undefined
							: incompleteObjectivesNextStep([{ name: task.name, objective: updates.objective }]);
					return {
						ok: true,
						id: task.id,
						name: task.name,
						...(changed ? {} : { changed }),
						...(nextStep ? { nextStep } : {}),
					};
				} catch (e) {
					return {
						ok: false,
						errors: [{ message: e instanceof Error ? e.message : String(e) }],
					};
				}
			})
			.build();
	}

	private buildUpdateSkillTool(agentId: string, projectId: string, user: User) {
		return new Tool(BUILDER_TOOLS.UPDATE_SKILL)
			.legacyNames(...getLegacyBuilderToolNames(BUILDER_TOOLS.UPDATE_SKILL))
			.description(
				'Update fields of an existing target-agent skill in place. It keeps the skill id and ' +
					'config ref. Load agent-builder-target-skills first. The skill is shared: the update ' +
					'saves its next version for every draft that follows the latest version. Published ' +
					'versions keep the version they pinned.',
			)
			.input(updateSkillInputSchema)
			.handler(async ({ skillId, baseSkillHash, updates }: UpdateSkillInput) => {
				const editorLock = await this.getEditorLockFailure(agentId);
				if (editorLock) return editorLock;
				const { references, instructionEdits, ...requiredUpdates } = updates;
				const normalizedUpdates = {
					...requiredUpdates,
					...(references !== undefined ? { references: references ?? undefined } : {}),
				};

				try {
					const updated = await this.agentSkillsService.updateSkill(
						agentId,
						projectId,
						skillId,
						normalizedUpdates,
						{ user, modifiedBy: 'builder' },
						baseSkillHash,
						instructionEdits,
					);
					return {
						ok: true,
						id: updated.id,
						name: updated.skill.name,
						...(updated.skillHash === baseSkillHash ? { changed: false } : {}),
					};
				} catch (e) {
					const message = e instanceof Error ? e.message : String(e);
					return { ok: false, errors: [{ message: updateSkillErrorMessage(e, message) }] };
				}
			})
			.build();
	}

	private buildCreateSkillsTool(agentId: string, projectId: string, user: User) {
		return new Tool(BUILDER_TOOLS.CREATE_SKILLS)
			.legacyNames(...getLegacyBuilderToolNames(BUILDER_TOOLS.CREATE_SKILLS))
			.description(
				'Create target-agent skills and attach a ref for each to config.skills. Do not patch the ' +
					'refs yourself. The agent config must exist. Load agent-builder-target-skills first: it ' +
					'has the required description and body templates and the skill rules. Pass every skill ' +
					'you can write in one `skills` array; the batch is all-or-nothing.',
			)
			.input(
				z.object({
					skills: z.array(createSkillInputSchema).min(1).max(20),
				}),
			)
			.handler(async ({ skills }: { skills: CreateSkillInput[] }) => {
				// Each skill is already validated against `.input()` (agentSkillSchema
				// shapes) by the tool runtime before the handler runs.
				const editorLock = await this.getEditorLockFailure(agentId);
				if (editorLock) return editorLock;
				try {
					const created = await this.agentSkillsService.createAndAttachSkills(
						agentId,
						projectId,
						skills,
						{ user, modifiedBy: 'builder' },
					);
					return {
						ok: true,
						configHash: created.configHash,
						skills: created.skills.map(({ id, skill }) => ({ id, name: skill.name })),
					};
				} catch (e) {
					const message =
						e instanceof SkillNameTakenError
							? `${skillNameTakenToolMessage(e.skillName)} The batch is all-or-nothing, so send every skill again.`
							: e instanceof Error
								? e.message
								: String(e);
					return { ok: false, errors: [{ message }] };
				}
			})
			.build();
	}

	private buildCustomToolTool(agentId: string, projectId: string, user: User) {
		return new Tool(BUILDER_TOOLS.BUILD_CUSTOM_TOOL)
			.legacyNames(...getLegacyBuilderToolNames(BUILDER_TOOLS.BUILD_CUSTOM_TOOL))
			.description(
				'Compile and store a custom tool from complete TypeScript source that uses ' +
					'`export default new Tool(...)`. A sandbox validates the code. The returned id is the ' +
					'tool name in the code. This does NOT add the tool to the config: add ' +
					'`{ type: "custom", id: "<tool name>" }` to `tools` with a config write.',
			)
			.input(
				z.object({
					code: z.string(),
				}),
			)
			.handler(async ({ code }: { code: string }, ctx) => {
				const editorLock = await this.getEditorLockFailure(agentId);
				if (editorLock) return editorLock;
				try {
					const descriptor = await this.secureRuntime.describeToolSecurely(code);
					const built = await this.agentCustomToolsService.buildCustomTool(
						agentId,
						projectId,
						code,
						descriptor,
						{ user, modifiedBy: 'builder' },
					);
					return { ok: true, id: built.id, name: descriptor.name, changed: built.changed };
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
	}

	private async getConfigSnapshot(
		agentId: string,
		projectId: string,
	): Promise<AgentConfigSnapshot> {
		const agent = await this.agentsService.findById(agentId, projectId);
		if (!agent) throw new Error('Agent not found');

		const config = composeJsonConfig(agent, await this.agentSkillRefs.refsForDraft(agent, {}));
		return snapshotFromConfig(config);
	}

	private async applyCredentialToMcpServer(
		agentId: string,
		projectId: string,
		serverName: string,
		credentialId: string,
		user: User,
	): Promise<McpCredentialApplyResult> {
		// agent_builder_verify_mcp_server still reports a successful verification; the
		// credential just is not written while a user is editing the agent.
		if (await this.getEditorLockFailure(agentId)) {
			return { applied: false };
		}
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

		const saved = await this.agentConfigService.updateConfig(
			agentId,
			projectId,
			configWithDefaults,
			user,
			{ baseConfigHash: snapshot.configHash, modifiedBy: 'builder' },
		);
		// Based on a fresh read, so the saved config can hold edits the model has not seen.
		return { applied: true, config: saved.config, configHash: saved.configHash };
	}

	/**
	 * Writes the results of a completed setup flow into the config: each
	 * credential into the empty node-tool slots of its type, and each answer to
	 * its config path. A path that does not resolve is reported, not fatal.
	 */
	private async applyFinishSetupToConfig(
		agentId: string,
		projectId: string,
		user: User,
		writes: FinishSetupConfigWrites,
	): Promise<FinishSetupConfigApplyResult> {
		const empty = { credentialTypes: [], paths: [] };
		const editorLock = await this.getEditorLockFailure(agentId);
		if (editorLock) return { ...empty, errors: editorLock.errors };

		const snapshot = await this.getConfigSnapshot(agentId, projectId);
		if (!snapshot.config) {
			return { ...empty, errors: [{ path: '(root)', message: 'Agent has no JSON config yet.' }] };
		}

		const jsonpatch = (await import('fast-json-patch')).default;
		let next = jsonpatch.deepClone(snapshot.config) as AgentJsonConfig;
		const credentialTypes: string[] = [];
		for (const credential of writes.credentials) {
			const filled = assignCredentialToNodeTools(
				next.tools,
				this.nodeTypes,
				credential.credentialType,
				{
					id: credential.id,
					name: credential.name,
				},
			);
			if (filled > 0) credentialTypes.push(credential.credentialType);
		}

		const paths: string[] = [];
		const errors: Array<{ path: string; message: string }> = [];
		for (const { path, value } of writes.values) {
			const op: Operation = { op: 'add', path, value };
			const invalid = jsonpatch.validate([op], next);
			if (invalid) {
				errors.push({ path, message: invalid.message ?? 'Config path does not resolve' });
				continue;
			}
			// A JSON Patch `add` replaces an existing value, and a setup answer must only fill an empty field.
			if (!isEmptyConfigValue(jsonpatch.getValueByPointer(next, path))) {
				errors.push({
					path,
					message: 'Config path already has a value. Patch it explicitly if it must change.',
				});
				continue;
			}
			next = jsonpatch.applyPatch(next, [op]).newDocument;
			paths.push(path);
		}

		if (credentialTypes.length === 0 && paths.length === 0) {
			return { ...empty, ...(errors.length ? { errors } : {}) };
		}

		const validated = this.validateBuilderConfig(next, snapshot.config);
		if (!validated.ok) return { ...empty, errors: validated.errors };
		const saved = await this.saveBuilderConfig(
			agentId,
			projectId,
			user,
			validated.config,
			snapshot.configHash,
			next,
			true,
		);
		if (!saved.ok) return { ...empty, errors: saved.errors };
		return {
			credentialTypes,
			paths,
			configHash: saved.configHash,
			...(errors.length ? { errors } : {}),
		};
	}

	private async getFreshConfigSnapshot(
		agentId: string,
		projectId: string,
		baseConfigHash: string | null,
	): Promise<{ ok: true; snapshot: AgentConfigSnapshot } | BuilderConfigFailure> {
		try {
			const snapshot = await this.getConfigSnapshot(agentId, projectId);
			if (baseConfigHash !== snapshot.configHash) {
				return { ok: false, stage: 'stale', errors: [STALE_CONFIG_ERROR], ...snapshot };
			}
			return { ok: true, snapshot };
		} catch (e) {
			return {
				ok: false,
				stage: 'stale',
				errors: [{ path: '(root)', message: e instanceof Error ? e.message : String(e) }],
			};
		}
	}

	private validateBuilderConfig(
		incoming: unknown,
		currentConfig: AgentJsonConfig | null,
	): { ok: true; config: AgentJsonConfig } | BuilderConfigFailure {
		const parsed = parseBuilderWriteConfig(incoming, currentConfig);
		if (!parsed.success) return { ok: false, errors: formatZodErrors(parsed.error) };
		const emptyInstructions = rejectIfEmptyInstructions(parsed.data, CLI_AGENT_CONFIG_MESSAGES);
		if (emptyInstructions) return { ok: false, errors: emptyInstructions };
		const unsupportedWebSearch = rejectIfUnsupportedNativeWebSearch(parsed.data);
		if (unsupportedWebSearch) return { ok: false, errors: unsupportedWebSearch };
		const dynamicSelectorFromAi = rejectIfDynamicSelectorUsesFromAi(
			parsed.data,
			currentConfig,
			this.nodeTypes,
			CLI_AGENT_CONFIG_MESSAGES,
		);
		if (dynamicSelectorFromAi) return { ok: false, errors: dynamicSelectorFromAi };
		// Save defaults explicitly so the write and read paths agree.
		const config = applyPromptCachingBuilderDefaults(
			applyNativeWebSearchDefaultOn(applyFreshAgentMemoryDefault(parsed.data, currentConfig)),
		);
		return { ok: true, config };
	}

	private async saveBuilderConfig(
		agentId: string,
		projectId: string,
		user: User,
		config: AgentJsonConfig,
		baseConfigHash: string | null,
		submitted: unknown,
		clearOmittedOptionalFields = false,
	): Promise<BuilderConfigSuccess | BuilderConfigFailure> {
		try {
			const saved = await this.agentConfigService.updateConfig(agentId, projectId, config, user, {
				baseConfigHash,
				clearOmittedOptionalFields,
				modifiedBy: 'builder',
			});
			return {
				ok: true,
				configHash: saved.configHash,
				...(isSameAgentConfig(saved.config, submitted) ? {} : { config: saved.config }),
			};
		} catch (e) {
			const errors = [{ path: '(root)', message: e instanceof Error ? e.message : String(e) }];
			if (!(e instanceof ConflictError)) return { ok: false, stage: 'schema', errors };
			const current = await this.getConfigSnapshot(agentId, projectId).catch(() => null);
			return {
				ok: false,
				stage: 'stale',
				errors: current ? [STALE_CONFIG_ERROR] : errors,
				...(current ?? {}),
			};
		}
	}

	private async writeBuilderConfig(
		agentId: string,
		projectId: string,
		user: User,
		input: unknown,
		baseConfigHash: string | null,
		track: BuilderTrackFn,
	) {
		const editorLock = await this.getEditorLockFailure(agentId);
		if (editorLock) return editorLock;
		const parsed = readStructuredToolInput(input);
		if (!parsed.ok) return { ok: false, errors: parsed.errors };
		const fresh = await this.getFreshConfigSnapshot(agentId, projectId, baseConfigHash);
		if (!fresh.ok) return fresh;
		const merged = mergeOmittedTopLevelFields(parsed.data, fresh.snapshot.config);
		const validated = this.validateBuilderConfig(merged, fresh.snapshot.config);
		if (!validated.ok) return validated;
		// Compare with the merged config, so kept fields alone do not echo the full config back.
		const saved = await this.saveBuilderConfig(
			agentId,
			projectId,
			user,
			validated.config,
			fresh.snapshot.configHash,
			merged,
		);
		if (saved.ok) trackRemovedTriggers(track, fresh.snapshot.config, validated.config);
		return saved;
	}

	private async patchBuilderConfig(
		agentId: string,
		projectId: string,
		user: User,
		operations: unknown,
		baseConfigHash: string | null,
		track: BuilderTrackFn,
	) {
		const editorLock = await this.getEditorLockFailure(agentId);
		if (editorLock) return { ...editorLock, stage: 'locked' };
		const parsed = readStructuredToolInput(operations);
		if (!parsed.ok) return { ok: false, stage: 'parse', errors: parsed.errors };
		const fresh = await this.getFreshConfigSnapshot(agentId, projectId, baseConfigHash);
		if (!fresh.ok) return fresh;
		if (!fresh.snapshot.config) {
			return {
				ok: false,
				stage: 'patch',
				errors: [{ path: '(root)', message: 'Agent has no JSON config yet.' }],
			};
		}
		const patched = await this.applyConfigPatch(parsed.data, fresh.snapshot.config);
		if (!patched.ok) return patched;
		const validated = this.validateBuilderConfig(patched.config, fresh.snapshot.config);
		if (!validated.ok) return { ...validated, stage: 'schema' };
		// The patch starts from the full stored config, so a missing field was removed by an op.
		const saved = await this.saveBuilderConfig(
			agentId,
			projectId,
			user,
			validated.config,
			fresh.snapshot.configHash,
			patched.config,
			true,
		);
		if (saved.ok) trackRemovedTriggers(track, fresh.snapshot.config, validated.config);
		return saved;
	}

	private async applyConfigPatch(
		operations: unknown,
		config: AgentJsonConfig,
	): Promise<{ ok: true; config: unknown } | BuilderConfigFailure> {
		const jsonpatch = (await import('fast-json-patch')).default;
		const ops = operations as Operation[];
		const patchError = jsonpatch.validate(ops, config);
		if (patchError) {
			const opPath = (patchError.operation as { path?: string } | undefined)?.path ?? '(root)';
			return {
				ok: false,
				stage: 'patch',
				errors: [{ path: opPath, message: patchError.message ?? 'Invalid patch operation' }],
			};
		}
		return { ok: true, config: jsonpatch.applyPatch(jsonpatch.deepClone(config), ops).newDocument };
	}

	private async formatDraftTestResult(
		result: AgentTestRunResult,
		ctx: InterruptibleToolContext<ApprovalSuspendPayload, ApprovalResumePayload>,
		agentId: string,
		user: User,
		previewPath: string,
		sessionNote?: string,
	) {
		if (result.status === 'session_not_found') {
			return {
				status: 'error',
				code: 'session_not_found',
				message:
					'This test session is no longer available. Call agent_builder_call_agent again without sessionId to start a new test.',
			};
		}
		const note = sessionNote ? { sessionNote } : {};
		if (result.status === 'agent_misconfigured') {
			return {
				status: 'error',
				code: 'agent_misconfigured',
				message: "This agent isn't ready to run yet. Finish configuring it and try again.",
				missing: result.missing,
			};
		}
		// A run that stopped on the iteration cap did not finish its work. Without
		// this the builder reads `completed` plus apologetic prose and retries.
		if (result.status === 'completed' && result.maxIterations) {
			return {
				status: 'error',
				code: 'max_iterations',
				message:
					'The agent stopped on its iteration cap before it answered. It did not complete the task. ' +
					'A repeat of the same test gives the same result. Common causes: a tool that returns too much data, ' +
					'so the agent re-queries it; instructions that loop; or a task that needs more steps than the cap allows. ' +
					'Report this to the user and ask before you change the agent.',
				sessionId: result.sessionId,
				response: result.response,
				...(result.executionId ? { executionId: result.executionId } : {}),
				...note,
			};
		}
		if (result.status === 'completed') return { ...result, ...note };

		const approvals = collectStandardApprovals(result);
		const firstApproval = approvals?.[0];
		if (firstApproval) {
			const { continuation, ...approval } = firstApproval;
			// Keep the note across the approval, so the resumed result still has it.
			return await ctx.suspend(approval, {
				continuation: sessionNote ? { run: continuation, sessionNote } : continuation,
			});
		}

		return {
			...(await this.cancelUnsupportedDraftTest(result, agentId, user, previewPath)),
			...note,
		};
	}

	private async cancelUnsupportedDraftTest(
		result: Extract<AgentTestRunResult, { status: 'suspended' }>,
		agentId: string,
		user: User,
		previewPath: string,
	) {
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
	}

	private createModelLookup(
		user: User,
		projectId: string,
		options?: BuilderToolsOptions,
	): ModelLookup {
		return {
			// `list` resolves the n8n Connect managed tag to the synthetic gateway
			// credential internally, so no managed branch is needed here.
			list: async (credentialId, credentialType, provider) =>
				await this.builderModelLiveLookupService.list(
					user,
					projectId,
					credentialId,
					credentialType,
					provider,
					{ useEvalModelCatalog: options?.useEvalModelCatalog === true },
				),
		};
	}
}
