import type { BuiltTool, CredentialProvider } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import {
	findNodeParameterProperty,
	getDynamicNodeParameterLookup,
	normalizeParameterPath,
} from '@n8n/ai-utilities/node-catalog';
import {
	agentSkillSchema,
	agentTaskSchema,
	formatZodErrors,
	RunnableAgentJsonConfigSchema,
	sanitizeAgentJsonConfig,
	tryParseConfigJson,
	type AgentJsonConfig,
	type ConfigValidationError,
} from '@n8n/api-types';
import { OutboundHttp, SsrfProtectionService } from '@n8n/backend-network';
import { SsrfProtectionConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils';
import type { Operation } from 'fast-json-patch';
import { createHash } from 'node:crypto';
import { z } from 'zod';

import { CredentialTypes } from '@/credential-types';
import { McpRegistryService } from '@/modules/mcp-registry/registry/mcp-registry.service';
import { NodeTypes } from '@/node-types';
import { OauthService } from '@/oauth/oauth.service';
import { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';
import { createAiMcpFetch } from '@/utils/ai-proxy-fetch';

import { AgentConfigService } from '../agent-config.service';
import { AgentCustomToolsService } from '../agent-custom-tools.service';
import { AgentIntegrationPersistenceService } from '../agent-integration-persistence.service';
import { AgentSkillsService } from '../agent-skills.service';
import { AgentTaskService } from '../agent-task.service';
import { AgentsToolsService } from '../agents-tools.service';
import { AgentsService } from '../agents.service';
import { BuilderModelLookupService } from './builder-model-lookup.service';
import { BUILDER_TOOLS } from './builder-tool-names';
import {
	collectFromAiParameterReferences,
	hasMatchingFromAiParameterReference,
	type FromAiParameterReference,
} from './from-ai-node-parameters';
import { buildGetResourceLocatorOptionsTool } from './get-resource-locator-options.tool';
import {
	buildAskCredentialTool,
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
import {
	getNativeWebSearchProviderTools,
	hasNativeWebSearchProvider,
} from '../json-config/native-web-search-provider-tools';
import { AgentRepository } from '../repositories/agent.repository';
import { AgentSecureRuntime } from '../runtime/agent-secure-runtime';

const EMPTY_INSTRUCTIONS_ERROR: ConfigValidationError = {
	path: '/instructions',
	message:
		'Refusing to write an agent with empty instructions. Ask the user what the agent should do before calling write_config or patch_config again.',
};

const STALE_CONFIG_ERROR: ConfigValidationError = {
	path: '(root)',
	message:
		'Agent config changed since you last read it. Call read_config and retry with the returned configHash.',
};

export interface AgentConfigSnapshot {
	config: AgentJsonConfig | null;
	configHash: string | null;
	updatedAt: string | null;
	versionId: string | null;
}

function rejectIfEmptyInstructions(
	config: AgentJsonConfig,
): { errors: ConfigValidationError[] } | null {
	if (!config.instructions.trim()) {
		return { errors: [EMPTY_INSTRUCTIONS_ERROR] };
	}
	return null;
}

function rejectIfUnsupportedNativeWebSearch(
	config: AgentJsonConfig,
): { errors: ConfigValidationError[] } | null {
	const webSearch = config.config?.webSearch;
	const requestsNativeWebSearch =
		webSearch?.enabled === true &&
		(webSearch.provider === undefined ||
			webSearch.provider === 'auto' ||
			webSearch.provider === 'native');
	if (!requestsNativeWebSearch || hasNativeWebSearchProvider(config.model)) return null;
	return {
		errors: [
			{
				path: '/config/webSearch/provider',
				message:
					'Native web search is only supported for Anthropic and OpenAI models. Use Brave or SearXNG fallback web search for this model.',
			},
		],
	};
}

type AgentConfigTool = NonNullable<AgentJsonConfig['tools']>[number];
type AgentConfigNodeTool = Extract<AgentConfigTool, { type: 'node' }>;

function isNodeTool(tool: AgentConfigTool | undefined): tool is AgentConfigNodeTool {
	return tool?.type === 'node';
}

function hasSameNodeType(left: AgentConfigNodeTool, right: AgentConfigNodeTool): boolean {
	return (
		left.node.nodeType === right.node.nodeType &&
		left.node.nodeTypeVersion === right.node.nodeTypeVersion
	);
}

function hasSameNodeToolIdentity(left: AgentConfigNodeTool, right: AgentConfigNodeTool): boolean {
	return left.name === right.name && hasSameNodeType(left, right);
}

function findPreviousNodeTool(
	previousConfig: AgentJsonConfig | null,
	currentTool: AgentConfigNodeTool,
	currentToolIndex: number,
): AgentConfigNodeTool | null {
	const previousTools = previousConfig?.tools ?? [];
	const sameIndexTool = previousTools[currentToolIndex];
	if (isNodeTool(sameIndexTool) && hasSameNodeToolIdentity(sameIndexTool, currentTool)) {
		return sameIndexTool;
	}

	const matchingTools = previousTools.filter(
		(tool): tool is AgentConfigNodeTool =>
			isNodeTool(tool) && hasSameNodeToolIdentity(tool, currentTool),
	);

	return matchingTools.length === 1 ? matchingTools[0] : null;
}

function getPreviousFromAiReferences(
	previousConfig: AgentJsonConfig | null,
	currentTool: AgentConfigNodeTool,
	currentToolIndex: number,
): FromAiParameterReference[] {
	const previousTool = findPreviousNodeTool(previousConfig, currentTool, currentToolIndex);
	if (!previousTool) return [];

	return collectFromAiParameterReferences(previousTool.node.nodeParameters);
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
 * The builder expresses web-search intent through `config.webSearch`; this
 * write-path normalizer persists provider-specific native tool details so
 * builder-saved configs are deterministic. Runtime reconstruction uses the
 * same policy defensively for configs saved through other entry points.
 */
function applyNativeWebSearchBuilderDefaults(config: AgentJsonConfig): AgentJsonConfig {
	const providerTools = getNativeWebSearchProviderTools(config, {
		includeDefaultArgs: true,
		defaultEnabled: true,
	});
	const webSearch = config.config?.webSearch;
	const fallbackWebSearch =
		webSearch?.enabled === true &&
		(webSearch.provider === 'brave' || webSearch.provider === 'searxng');
	const hasNativeWebSearch =
		!fallbackWebSearch && webSearch?.enabled !== false && hasNativeWebSearchProvider(config.model);

	if (!hasNativeWebSearch) {
		const { webSearch, ...restConfig } = config.config ?? {};
		const { config: _config, providerTools: _providerTools, ...restAgentConfig } = config;
		const normalizedConfig = {
			...restConfig,
			...(fallbackWebSearch ? { webSearch } : {}),
		};
		return {
			...restAgentConfig,
			...(Object.keys(normalizedConfig).length > 0 ? { config: normalizedConfig } : {}),
			...(Object.keys(providerTools).length > 0 ? { providerTools } : {}),
		};
	}

	return {
		...config,
		config: {
			...(config.config ?? {}),
			webSearch: { enabled: true },
		},
		providerTools,
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
		private readonly workflowRepository: WorkflowRepository,
		private readonly agentsToolsService: AgentsToolsService,
		private readonly builderModelLookupService: BuilderModelLookupService,
		private readonly mcpRegistryService: McpRegistryService,
		private readonly oauthService: OauthService,
		private readonly credentialTypes: CredentialTypes,
		private readonly agentTaskService: AgentTaskService,
		private readonly agentRepository: AgentRepository,
		private readonly outboundHttp: OutboundHttp,
		private readonly dynamicNodeParametersService: DynamicNodeParametersService,
		private readonly nodeTypes: NodeTypes,
		private readonly ssrfConfig: SsrfProtectionConfig,
		private readonly ssrfProtectionService: SsrfProtectionService,
	) {}

	private getDynamicSelectorPath(
		nodeTypeDescription: ReturnType<NodeTypes['getByNameAndVersion']>,
		parameterPath: string,
	): string | null {
		const normalizedPath = normalizeParameterPath(parameterPath);
		const pathParts = normalizedPath.split('.');

		for (let length = pathParts.length; length > 0; length--) {
			const candidatePath = pathParts.slice(0, length).join('.');
			const property = findNodeParameterProperty(
				nodeTypeDescription.description.properties,
				candidatePath,
			);
			if (!property) continue;

			const lookup = getDynamicNodeParameterLookup(property);
			if (lookup) return candidatePath;
		}

		return null;
	}

	private rejectIfDynamicSelectorUsesFromAi(
		config: AgentJsonConfig,
		previousConfig: AgentJsonConfig | null,
	): { errors: ConfigValidationError[] } | null {
		const errors: ConfigValidationError[] = [];

		for (const [toolIndex, tool] of (config.tools ?? []).entries()) {
			if (tool.type !== 'node') continue;

			const fromAiReferences = collectFromAiParameterReferences(tool.node.nodeParameters);
			if (fromAiReferences.length === 0) continue;

			let nodeTypeDescription: ReturnType<NodeTypes['getByNameAndVersion']>;
			try {
				nodeTypeDescription = this.nodeTypes.getByNameAndVersion(
					tool.node.nodeType,
					tool.node.nodeTypeVersion,
				);
			} catch {
				continue;
			}

			const previousFromAiReferences = getPreviousFromAiReferences(previousConfig, tool, toolIndex);
			const reportedDynamicPaths = new Set<string>();
			for (const fromAiReference of fromAiReferences) {
				const { parameterPath, jsonPointer } = fromAiReference;
				const dynamicPath = this.getDynamicSelectorPath(nodeTypeDescription, parameterPath);
				if (!dynamicPath || reportedDynamicPaths.has(dynamicPath)) continue;
				if (hasMatchingFromAiParameterReference(previousFromAiReferences, fromAiReference)) {
					continue;
				}

				reportedDynamicPaths.add(dynamicPath);
				errors.push({
					path: `/tools/${toolIndex}/node/nodeParameters/${jsonPointer}`,
					message:
						`Node tool "${tool.name}" parameter "${dynamicPath}" is a dynamic selector. ` +
						'Do not use $fromAI for this value. Load skill agent-builder-resource-locators, ' +
						'use ask_credential if credentials are missing, then call get_resource_locator_options ' +
						'and write the returned parameterValue into nodeParameters.',
				});
			}
		}

		if (errors.length === 0) return null;

		return { errors };
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
					const emptyInstructions = rejectIfEmptyInstructions(zodResult.data);
					if (emptyInstructions) {
						return { ok: false, errors: emptyInstructions.errors };
					}
					const unsupportedNativeWebSearch = rejectIfUnsupportedNativeWebSearch(zodResult.data);
					if (unsupportedNativeWebSearch) {
						return { ok: false, errors: unsupportedNativeWebSearch.errors };
					}
					const dynamicSelectorFromAi = this.rejectIfDynamicSelectorUsesFromAi(
						zodResult.data,
						snapshot.config,
					);
					if (dynamicSelectorFromAi) {
						return { ok: false, errors: dynamicSelectorFromAi.errors };
					}
					const normalizedConfig = applyNativeWebSearchBuilderDefaults(zodResult.data);
					try {
						const result = await this.agentConfigService.updateConfig(
							agentId,
							projectId,
							normalizedConfig,
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
					const emptyInstructions = rejectIfEmptyInstructions(zodResult.data);
					if (emptyInstructions) {
						return { ok: false, stage: 'schema', errors: emptyInstructions.errors };
					}
					const unsupportedNativeWebSearch = rejectIfUnsupportedNativeWebSearch(zodResult.data);
					if (unsupportedNativeWebSearch) {
						return { ok: false, stage: 'schema', errors: unsupportedNativeWebSearch.errors };
					}
					const dynamicSelectorFromAi = this.rejectIfDynamicSelectorUsesFromAi(
						zodResult.data,
						snapshot.config,
					);
					if (dynamicSelectorFromAi) {
						return { ok: false, stage: 'schema', errors: dynamicSelectorFromAi.errors };
					}
					const normalizedConfig = applyNativeWebSearchBuilderDefaults(zodResult.data);

					try {
						const result = await this.agentConfigService.updateConfig(
							agentId,
							projectId,
							normalizedConfig,
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
			list: async (credentialId, credentialType, lookup) =>
				await this.builderModelLookupService.list(user, credentialId, credentialType, lookup),
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
					'sandbox and saved against the agent, but this does NOT register the tool in the ' +
					'agent config — follow up with patch_config (or write_config) to add a ' +
					'`{ type: "custom", id }` entry to `tools` so the agent actually uses it. ' +
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
					'routing description, and the full skill body. The description is what the runtime sees when ' +
					'deciding when to load it, and the body MUST follow the required structured format (Overview, ' +
					'Inputs, Steps, Rules, Example, Gotchas) filled with concrete content — see the body parameter ' +
					'for the template. You MUST NOT call this with a vague description or a thin/placeholder body: ' +
					'if you lack the domain detail to write a genuinely useful skill, ask the user clarifying ' +
					'questions first. This does NOT attach the skill to the agent config; follow up with read_config ' +
					'and patch_config (or write_config) to add a `{ type: "skill", id }` entry to `skills`. ' +
					'Returns { ok: true, id, skill } or { ok: false, errors }.',
			)
			.systemInstruction(
				'Never create a vague or placeholder skill. The description is the routing contract (what the ' +
					'skill does + when to load it); the body must follow the required structured Markdown template ' +
					'(Overview, Inputs, Steps, Rules, Example, Gotchas) with each applicable section filled in with ' +
					'concrete, specific content. If you do not have enough domain detail to write a genuinely ' +
					'useful skill, ask the user clarifying questions until you do before calling create_skill.',
			)
			.input(
				z.object({
					name: agentSkillSchema.shape.name.describe('Human-readable skill name'),
					description: agentSkillSchema.shape.description.describe(SKILL_DESCRIPTION_RULE),
					body: agentSkillSchema.shape.instructions.describe(SKILL_BODY_GUIDANCE),
				}),
			)
			.handler(
				async ({
					name,
					description,
					body,
				}: {
					name: string;
					description: string;
					body: string;
				}) => {
					// Input is already validated against `.input()` (agentSkillSchema
					// shapes) by the tool runtime before the handler runs.
					const skill = { name, description, instructions: body };

					try {
						const created = await this.agentSkillsService.createSkill(agentId, projectId, skill);
						return { ok: true, id: created.id, skill: created.skill };
					} catch (e) {
						return {
							ok: false,
							errors: [{ message: e instanceof Error ? e.message : String(e) }],
						};
					}
				},
			)
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
					'Only returns workflows with supported trigger types.',
			)
			.input(z.object({}))
			.handler(async () => {
				const workflows = await this.workflowRepository.find({
					select: ['id', 'name', 'nodes', 'active', 'updatedAt'],
					where: { shared: { projectId } },
					relations: ['shared'],
					order: { updatedAt: 'DESC' },
					take: 100,
				});

				// Keys are n8n node type IDs, which use the dotted "package.nodeName"
				// format — the naming-convention rule doesn't apply to those.
				/* eslint-disable @typescript-eslint/naming-convention */
				const SUPPORTED_TRIGGERS: Record<string, string> = {
					'n8n-nodes-base.manualTrigger': 'manual',
					'n8n-nodes-base.executeWorkflowTrigger': 'executeWorkflow',
					'n8n-nodes-base.chatTrigger': 'chat',
					'n8n-nodes-base.scheduleTrigger': 'schedule',
					'n8n-nodes-base.formTrigger': 'form',
				};
				/* eslint-enable @typescript-eslint/naming-convention */

				const compatible = workflows
					.map((w) => {
						const triggerNode = (w.nodes ?? []).find(
							(n: { type: string }) => SUPPORTED_TRIGGERS[n.type],
						);
						if (!triggerNode) return null;
						return {
							name: w.name,
							active: w.active,
							triggerType: SUPPORTED_TRIGGERS[triggerNode.type],
						};
					})
					.filter(Boolean);

				return { workflows: compatible };
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
