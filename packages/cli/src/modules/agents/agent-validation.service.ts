import type { CredentialProvider } from '@n8n/agents';
import { getProviderPrefix } from '@n8n/ai-utilities/agent-config';
import { getRequiredNodeCredentialSlots } from '@n8n/ai-utilities/node-catalog';
import {
	AgentModelSchema,
	AI_GATEWAY_MANAGED_TAG,
	agentTaskSchema,
	findVectorStoreToolNameCollisions,
	getAgentModelProviderCredentialTypes,
	getWorkflowToolIncompatibilityReason,
	isDraftAgentConfig,
	isDraftIntegration,
	nodeTypeAvailabilityScopeSchema,
	type AgentConfigValidationIssue,
	type AgentConfigValidationIssueCode,
	type AgentConfigValidationResponse,
	type AgentConfigValidationRestriction,
	type AgentConfigValidationWarning,
	type AgentIntegrationConfig,
	type AgentTaskConfig,
	type AgentJsonConfig,
	type AgentJsonNodeToolConfig,
	type AgentJsonWorkflowToolConfig,
	type AgentSkill,
} from '@n8n/api-types';
import { WorkflowRepository, type WorkflowEntity } from '@n8n/db';
import type { PolicyViolation } from '@n8n/decorators';
import { Service } from '@n8n/di';
import {
	isMcpOAuth2Authentication,
	NodeHelpers,
	type INodeParameters,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { getMissingSkillIds } from '@/modules/agents/utils/agent-missing-skill-ids';
import { deniedNodeTypes } from '@/modules/type-availability-policies/type-violation';
import { NodeTypes } from '@/node-types';
import {
	toPolicedMcpNodes,
	toPolicedNodes,
	withInlineAgentToolNodes,
} from '@/policy/policed-agent-nodes';
import { checkAiGatewayEligibility } from '@/services/ai-gateway-eligibility';
import { AiGatewayService } from '@/services/ai-gateway.service';

import { AgentDefinitionService } from './agent-definition.service';
import { AgentPolicyService } from './agent-policy.service';
import { AgentSkillRefsService } from './agent-skill-refs.service';
import {
	getAgentDefinitionContent,
	type AgentDefinition,
	type PendingSkillRefs,
} from './utils/agent-definition';
import type { AgentHistory } from './entities/agent-history.entity';
import type { Agent } from './entities/agent.entity';
import type { AgentSkillRefs } from './json-config/agent-document';
import { ChatIntegrationRegistry } from './integrations/agent-chat-integration';
import { isValidCronExpression } from './integrations/cron-validation';
import { AgentRepository } from './repositories/agent.repository';
import { findWorkflowToolWorkflows } from './tools/workflow-tool-workflow-resolver';
import { extractAgentWorkflowRefs } from './utils/extract-agent-workflow-refs';
import { findHttpRequestToolUrlFromAiViolations } from './utils/node-tool-validation';
import { findNameClashGroups } from '@/modules/skills/skill-names';

type AgentValidationScope = 'runtime' | 'publish';

type FindCredential = (
	credentialId: string,
) => Promise<Awaited<ReturnType<CredentialProvider['list']>>[number] | undefined>;

type CustomToolEntries = Agent['tools'];
type TaskBody = AgentTaskConfig;

interface ConfigurationValidationContext {
	agentId: string;
	projectId: string;
	config: AgentJsonConfig;
	skills: Record<string, AgentSkill>;
	customTools: CustomToolEntries;
	integrations: AgentIntegrationConfig[];
	tasks: ReadonlyMap<string, TaskBody>;
	credentialProvider: CredentialProvider;
}

function issue(
	code: AgentConfigValidationIssueCode,
	path: string,
	capability: AgentConfigValidationIssue['capability'],
	reason?: string,
	restriction?: AgentConfigValidationRestriction,
): AgentConfigValidationIssue {
	return {
		code,
		path,
		capability,
		...(reason === undefined ? {} : { reason }),
		...(restriction === undefined ? {} : { restriction }),
	};
}

const RESTRICTED_BY_INLINE_TOOL = 'restricted_by_inline_tool';

/**
 * A locked entry shows one reason, not a lock plus the credential issues of a tool the agent
 * cannot use at all. A tool locked only by its inline agent keeps them: it stays usable once
 * the embedded tool is removed.
 */
function withoutIssuesOfLockedEntries(
	issues: AgentConfigValidationIssue[],
): AgentConfigValidationIssue[] {
	const entryKey = ({ capability }: AgentConfigValidationIssue) =>
		`${capability.kind}:${capability.index}`;
	const locked = new Set(
		issues
			.filter((i) => i.code === 'restricted_node_type' && i.reason !== RESTRICTED_BY_INLINE_TOOL)
			.map(entryKey),
	);
	if (locked.size === 0) return issues;

	return issues.filter((i) => i.code === 'restricted_node_type' || !locked.has(entryKey(i)));
}

/** A scope the API does not know is dropped rather than passed on as an open string. */
function toRestriction(
	nodeType: string,
	violation: PolicyViolation,
): AgentConfigValidationRestriction {
	const scope = nodeTypeAvailabilityScopeSchema.safeParse(violation.scope);
	return scope.success ? { nodeType, scope: scope.data } : { nodeType };
}

function agentIssue(
	code: AgentConfigValidationIssueCode,
	path: string,
): AgentConfigValidationIssue {
	return issue(code, path, { kind: 'agent' });
}

@Service()
export class AgentValidationService {
	constructor(
		private readonly agentRepository: AgentRepository,
		private readonly definitionService: AgentDefinitionService,
		private readonly nodeTypes: NodeTypes,
		private readonly workflowRepository: WorkflowRepository,
		private readonly chatIntegrationRegistry: ChatIntegrationRegistry,
		private readonly aiGatewayService: AiGatewayService,
		private readonly agentSkillRefs: AgentSkillRefsService,
		private readonly agentPolicyService: AgentPolicyService,
	) {}

	/**
	 * Whether n8n Connect (AI Gateway) can serve the model's provider, using only
	 * the cached gateway config — this static validator must not perform a network
	 * fetch. Returns `undefined` when support can't be determined (no cached
	 * config), so the caller can tell "gateway says no" from "could not ask".
	 */
	private isAiGatewayModelSupported(model: string): boolean | undefined {
		const provider = getProviderPrefix(model);
		if (!provider) return false;
		const credentialType = this.aiGatewayService.getCredentialTypeForProviderCached(provider);
		if (credentialType === undefined) return undefined;
		return credentialType !== null;
	}

	/**
	 * Backward-compatible wrapper over {@link validateAgentConfiguration}.
	 * Returns the flat list of issue paths — used by the chat SSE
	 * `agent_misconfigured` error and other call sites that predate
	 * structured issues.
	 */
	async validateAgentIsRunnable(
		agentId: string,
		projectId: string,
		credentialProvider: CredentialProvider,
	): Promise<{ missing: string[] }> {
		const { issues } = await this.validateAgentConfiguration(
			agentId,
			projectId,
			credentialProvider,
			'runtime',
		);
		return { missing: issues.map((i) => i.path) };
	}

	/**
	 * Canonical, static validation of an agent's current draft configuration.
	 * Every configured/enabled capability must be internally usable (valid
	 * shape, accessible credentials, resolvable references) for the agent to
	 * be considered valid — absent or disabled optional capabilities are
	 * ignored. Never performs network/live checks (no MCP handshake, no
	 * workflow execution, no credential test calls).
	 */
	async validateAgentConfiguration(
		agentId: string,
		projectId: string,
		credentialProvider: CredentialProvider,
		scope: AgentValidationScope = 'publish',
	): Promise<AgentConfigValidationResponse> {
		const agentEntity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agentEntity) {
			return { status: 'invalid', issues: [agentIssue('missing_required', 'agent')] };
		}

		return await this.validateLoadedAgentConfiguration(
			agentEntity,
			projectId,
			credentialProvider,
			scope,
		);
	}

	/** `pending`: skill refs that the caller is about to save, in place of the stored refs. */
	async validateLoadedAgentConfiguration(
		agent: Agent,
		projectId: string,
		credentialProvider: CredentialProvider,
		scope: AgentValidationScope = 'publish',
		pending?: PendingSkillRefs,
	): Promise<AgentConfigValidationResponse> {
		if (scope === 'runtime') {
			return await this.validateAgentEntityConfiguration(
				agent,
				pending ? pending.skillRefs : await this.agentSkillRefs.refsForDraft(agent, {}),
				projectId,
				new Map(),
				credentialProvider,
				scope,
			);
		}
		const definition = await this.definitionService.readDraft(agent, {}, pending);
		return await this.validateDefinition(
			agent.id,
			projectId,
			definition,
			agent.integrations ?? [],
			credentialProvider,
			scope,
		);
	}

	/**
	 * Same as {@link validateAgentConfiguration}, but validates the given
	 * already-loaded `Agent` entity and task map directly, without refetching
	 * either from the database. Callers that already hold the exact entity
	 * they are about to persist (e.g. a publish flow) must use this instead,
	 * so the data that gets validated is guaranteed to be the data that gets
	 * saved — a DB refetch here would otherwise open a window for a
	 * concurrent write to invalidate that guarantee.
	 */
	async validateAgentEntityConfiguration(
		agent: Agent,
		skillRefs: AgentSkillRefs,
		projectId: string,
		tasks: ReadonlyMap<string, TaskBody>,
		credentialProvider: CredentialProvider,
		scope: AgentValidationScope = 'publish',
	): Promise<AgentConfigValidationResponse> {
		const skills = await this.agentSkillRefs.skillsForRefs(agent, skillRefs, {});
		return await this.validateDefinition(
			agent.id,
			projectId,
			{ ...getAgentDefinitionContent(agent, skillRefs, skills), tasks },
			agent.integrations ?? [],
			credentialProvider,
			scope,
		);
	}

	/**
	 * Same as {@link validateAgentConfiguration}, but against a specific
	 * published history snapshot instead of the live draft. Used before
	 * re-publishing a previously published version. Credential-backed
	 * integrations use the current draft; n8n Chat needs no credential check.
	 */
	async validateAgentHistoryConfiguration(
		agentId: string,
		projectId: string,
		history: AgentHistory,
		currentIntegrations: AgentIntegrationConfig[],
		credentialProvider: CredentialProvider,
	): Promise<AgentConfigValidationResponse> {
		const definition = await this.definitionService.readVersion(history);
		return await this.validateDefinition(
			agentId,
			projectId,
			definition,
			currentIntegrations,
			credentialProvider,
			'publish',
		);
	}

	private async validateDefinition(
		agentId: string,
		projectId: string,
		definition: AgentDefinition,
		integrations: AgentIntegrationConfig[],
		credentialProvider: CredentialProvider,
		scope: AgentValidationScope,
	): Promise<AgentConfigValidationResponse> {
		return await this.runValidation(
			{
				agentId,
				projectId,
				config: definition.schema,
				skills: definition.skills,
				customTools: definition.tools,
				tasks: definition.tasks,
				integrations,
				credentialProvider,
			},
			scope,
		);
	}

	private async runValidation(
		ctx: Omit<ConfigurationValidationContext, 'config'> & { config: AgentJsonConfig | null },
		scope: AgentValidationScope = 'publish',
	): Promise<AgentConfigValidationResponse> {
		if (!ctx.config) {
			return { status: 'invalid', issues: this.missingConfigIssues() };
		}

		const issues = await this.collectIssues({ ...ctx, config: ctx.config }, scope);
		const warnings = this.collectSkillNameWarnings(ctx.config, ctx.skills);
		return {
			status: issues.length === 0 ? 'valid' : 'invalid',
			issues,
			...(warnings.length > 0 ? { warnings } : {}),
		};
	}

	/** Skill names that are hard to tell apart confuse the model, but do not block a run. */
	private collectSkillNameWarnings(
		config: AgentJsonConfig,
		skills: Record<string, AgentSkill>,
	): AgentConfigValidationWarning[] {
		const names = (config.skills ?? []).flatMap((ref) =>
			Object.hasOwn(skills, ref.id) ? [skills[ref.id].name] : [],
		);
		return findNameClashGroups(names).map((group) => ({
			code: 'similar_skill_names',
			capability: { kind: 'skill' },
			names: group,
		}));
	}

	private missingConfigIssues(): AgentConfigValidationIssue[] {
		return [
			agentIssue('missing_required', 'instructions'),
			agentIssue('missing_required', 'model'),
			agentIssue('missing_credential', 'credential'),
		];
	}

	private async collectIssues(
		ctx: ConfigurationValidationContext,
		scope: AgentValidationScope,
	): Promise<AgentConfigValidationIssue[]> {
		const { config } = ctx;
		const issues: AgentConfigValidationIssue[] = [];

		let credentialList: Awaited<ReturnType<CredentialProvider['list']>> | undefined;
		const findCredential: FindCredential = async (credentialId) => {
			credentialList ??= await ctx.credentialProvider.list();
			return credentialList.find((credential) => credential.id === credentialId);
		};

		const { agentsById, workflowsByReference } = await this.prefetchReferenceLookups(ctx);

		this.collectCoreIssues(config, issues);
		this.collectVectorStoreIssues(config, issues);
		await this.collectMainCredentialIssues(
			config,
			findCredential,
			ctx.credentialProvider,
			scope,
			issues,
		);
		await this.collectVertexModelIssues(config, findCredential, issues);
		this.collectSubAgentRefIssues(ctx, agentsById, issues);
		this.collectSkillIssues(config, ctx.skills, issues);
		// Runs in both scopes: the runtime scope is what blocks the draft preview.
		await this.collectRestrictedTypeIssues(ctx, issues);
		if (scope === 'publish') {
			for (const violation of findHttpRequestToolUrlFromAiViolations(config.tools)) {
				if (config.tools?.[violation.toolIndex].enabled === false) continue;
				issues.push(
					issue('invalid_value', violation.path, {
						kind: 'tool',
						id: violation.toolName,
						index: violation.toolIndex,
						toolType: 'node',
					}),
				);
			}
			this.collectTaskIssues(config, ctx.tasks, issues);
			await this.collectChannelIssues(ctx.integrations, findCredential, issues);
		}
		await this.collectToolIssues(ctx, findCredential, workflowsByReference, issues, scope);
		await this.collectMcpServerIssues(config, findCredential, issues);

		return this.dedupe(withoutIssuesOfLockedEntries(issues));
	}

	private async prefetchReferenceLookups(ctx: ConfigurationValidationContext): Promise<{
		agentsById: Map<string, Pick<Agent, 'id' | 'activeVersionId'>>;
		workflowsByReference: Map<string, WorkflowEntity>;
	}> {
		const subAgentIds = new Set<string>();
		const workflowRefs = extractAgentWorkflowRefs(ctx.config).filter(
			(ref) => ref.enabled !== false && ref.workflow,
		);

		for (const ref of ctx.config.subAgents?.agents ?? []) {
			if (ref.enabled === false) continue;
			if (ref.agentId && ref.agentId !== ctx.agentId) {
				subAgentIds.add(ref.agentId);
			}
		}

		const [agents, workflowsByReference] = await Promise.all([
			this.agentRepository.findByIdsAndProjectId([...subAgentIds], ctx.projectId),
			findWorkflowToolWorkflows(this.workflowRepository, workflowRefs, ctx.projectId),
		]);

		return {
			agentsById: new Map(agents.map((agent) => [agent.id, agent])),
			workflowsByReference,
		};
	}

	private dedupe(issues: AgentConfigValidationIssue[]): AgentConfigValidationIssue[] {
		const seen = new Set<string>();
		const result: AgentConfigValidationIssue[] = [];
		for (const item of issues) {
			const key = `${item.code}:${item.path}`;
			if (seen.has(key)) continue;
			seen.add(key);
			result.push(item);
		}
		return result;
	}

	private collectCoreIssues(config: AgentJsonConfig, issues: AgentConfigValidationIssue[]) {
		if (!config.instructions?.trim()) {
			issues.push(agentIssue('missing_required', 'instructions'));
		}

		if (isDraftAgentConfig(config)) {
			issues.push(agentIssue('missing_required', 'model'));
		} else if (!AgentModelSchema.safeParse(config.model).success) {
			issues.push(agentIssue('invalid_value', 'model'));
		}
	}

	private async collectMainCredentialIssues(
		config: AgentJsonConfig,
		findCredential: FindCredential,
		credentialProvider: CredentialProvider,
		scope: AgentValidationScope,
		issues: AgentConfigValidationIssue[],
	) {
		if (!config.credential?.trim()) {
			issues.push(agentIssue('missing_credential', 'credential'));
			return;
		}

		const credentialId = config.credential.trim();

		// n8n Connect managed credential: no stored credential to resolve — it is
		// valid as long as the gateway can serve the selected model's provider.
		if (credentialId === AI_GATEWAY_MANAGED_TAG) {
			const model = config.model?.trim();
			// Only flag a definitive "gateway does not serve this provider". When
			// support can't be determined (no cached gateway config), don't fail
			// closed — a transient/cold config must not make a working managed agent
			// look broken and block Publish / chat runs. A missing model is already
			// reported against `model` by `collectCoreIssues`, so it is not the
			// credential's problem.
			if (model && this.isAiGatewayModelSupported(model) === false) {
				issues.push(agentIssue('incompatible_credential', 'credential'));
			}
			return;
		}

		const credential = await this.findCredentialSafe(findCredential, credentialId);
		if (!credential) {
			issues.push(agentIssue('invalid_credential', 'credential'));
			return;
		}

		const model = config.model?.trim();
		if (
			model &&
			AgentModelSchema.safeParse(model).success &&
			!this.credentialSupportsModel(credential.type, model)
		) {
			issues.push(agentIssue('incompatible_credential', 'credential'));
		}

		if (scope === 'publish') {
			await this.collectAzureEndpointIssues(config, credentialId, credentialProvider, issues);
		}
	}

	private async collectVertexModelIssues(
		config: AgentJsonConfig,
		findCredential: FindCredential,
		issues: AgentConfigValidationIssue[],
	): Promise<void> {
		type ModelSlot = Pick<AgentJsonConfig, 'model' | 'credential'>;
		const slots: Array<[string, ModelSlot | undefined]> = [
			...Object.entries(config.subAgents?.modelsByDifficulty ?? {}).map(
				([difficulty, model]): [string, ModelSlot] => [
					`subAgents.modelsByDifficulty.${difficulty}.`,
					model,
				],
			),
		];
		if (config.memory?.enabled) {
			const observational = config.memory.observationalMemory;
			if (observational?.enabled !== false) {
				slots.push(
					['memory.observationalMemory.observerModel.', observational?.observerModel],
					['memory.observationalMemory.reflectorModel.', observational?.reflectorModel],
				);
			}
			const episodic = config.memory.episodicMemory;
			if (episodic?.enabled) {
				slots.push(['memory.episodicMemory.reflectorModel.', episodic.reflectorModel]);
			}
		}
		for (const [path, model] of slots) {
			if (!model || getProviderPrefix(model.model) !== 'google-vertex') continue;
			if (!model.credential?.trim()) {
				issues.push(agentIssue('missing_credential', `${path}credential`));
				continue;
			}
			const credential = await this.findCredentialSafe(findCredential, model.credential.trim());
			if (!credential) {
				issues.push(agentIssue('invalid_credential', `${path}credential`));
			} else if (!this.credentialSupportsModel(credential.type, model.model)) {
				issues.push(agentIssue('incompatible_credential', `${path}credential`));
			}
		}
	}

	private collectSubAgentRefIssues(
		ctx: ConfigurationValidationContext,
		agentsById: Map<string, Pick<Agent, 'id'>>,
		issues: AgentConfigValidationIssue[],
	) {
		const refs = ctx.config.subAgents?.agents ?? [];
		for (let index = 0; index < refs.length; index++) {
			const ref = refs[index];
			if (ref.enabled === false) continue;
			const path = `subAgents.agents.${index}.agentId`;
			const capability: AgentConfigValidationIssue['capability'] = {
				kind: 'subAgent',
				id: ref.agentId,
				index,
			};

			if (ref.agentId === ctx.agentId) {
				issues.push(issue('incompatible_reference', path, capability));
				continue;
			}

			const target = agentsById.get(ref.agentId);
			if (!target) {
				issues.push(issue('missing_reference', path, capability));
			}
		}
	}

	private collectSkillIssues(
		config: AgentJsonConfig,
		skills: Record<string, AgentSkill>,
		issues: AgentConfigValidationIssue[],
	) {
		for (const skillId of getMissingSkillIds(config.skills, skills)) {
			issues.push(issue('missing_reference', `skill:${skillId}`, { kind: 'skill', id: skillId }));
		}
	}

	private collectTaskIssues(
		config: AgentJsonConfig,
		tasks: ReadonlyMap<string, TaskBody>,
		issues: AgentConfigValidationIssue[],
	) {
		const refs = config.tasks ?? [];
		for (let index = 0; index < refs.length; index++) {
			const ref = refs[index];
			const task = tasks.get(ref.id);
			if (!task) {
				issues.push(
					issue('missing_reference', `tasks.${index}.id`, { kind: 'task', id: ref.id, index }),
				);
				continue;
			}
			if (!ref.enabled) continue;
			if (!agentTaskSchema.safeParse(task).success || !isValidCronExpression(task.cronExpression)) {
				issues.push(issue('invalid_value', `tasks.${index}`, { kind: 'task', id: ref.id, index }));
			}
		}
	}

	/**
	 * A vector store registers a `search_<sanitized-name>` tool at runtime; a
	 * collision with a configured tool name only fails once the agent is built.
	 * The write gate (AgentConfigService.validateConfig) checks this too — this
	 * re-check covers configs that reached the entity through other paths
	 * (e.g. history restore).
	 */
	private collectVectorStoreIssues(config: AgentJsonConfig, issues: AgentConfigValidationIssue[]) {
		const collisions = new Set(findVectorStoreToolNameCollisions(config));
		const stores = config.vectorStores ?? [];
		for (let index = 0; index < stores.length; index++) {
			const store = stores[index];
			if (!collisions.has(`search_${store.name.replace(/-/g, '_')}`)) continue;
			issues.push(
				issue('invalid_value', `vectorStores.${index}.name`, {
					kind: 'vectorStore',
					id: store.name,
					index,
				}),
			);
		}
	}

	private async collectChannelIssues(
		integrations: AgentIntegrationConfig[],
		findCredential: FindCredential,
		issues: AgentConfigValidationIssue[],
	) {
		for (let index = 0; index < integrations.length; index++) {
			const integration = integrations[index];
			if (integration.type === 'n8n_chat') continue;
			const path = `integrations.${index}.credentialId`;
			const capability: AgentConfigValidationIssue['capability'] = {
				kind: 'channel',
				id: integration.type,
				index,
			};
			if (isDraftIntegration(integration)) {
				issues.push(issue('missing_credential', path, capability));
				continue;
			}
			const credentialId = integration.credentialId.trim();

			const credential = await this.findCredentialSafe(findCredential, credentialId);
			if (!credential) {
				issues.push(issue('invalid_credential', path, capability));
				continue;
			}

			const integrationImpl = this.chatIntegrationRegistry.get(integration.type);
			if (integrationImpl && !integrationImpl.credentialTypes.includes(credential.type)) {
				issues.push(issue('incompatible_credential', path, capability));
			}
		}
	}

	/**
	 * Reports every tool and MCP server whose node type a policy denies.
	 *
	 * Reads the types through the same mapping the publish gate polices, so the reported set
	 * and the refused publish never disagree, inline agents and MCP servers included. Disabled
	 * tools are reported too, because the gate does not read `enabled`.
	 */
	private async collectRestrictedTypeIssues(
		ctx: ConfigurationValidationContext,
		issues: AgentConfigValidationIssue[],
	): Promise<void> {
		const { config } = ctx;

		const decision = await this.agentPolicyService.evaluatePublish(ctx.projectId, ctx.agentId, {
			name: config.name,
			tools: config.tools,
			mcpServers: config.mcpServers,
		});
		const denied = deniedNodeTypes(decision);
		if (denied.size === 0) return;

		const firstDenied = (nodes: readonly { type: string }[]) => {
			for (const node of nodes) {
				const violation = denied.get(node.type);
				if (violation) return toRestriction(node.type, violation);
			}
			return undefined;
		};

		const tools = config.tools ?? [];
		for (let index = 0; index < tools.length; index++) {
			const tool = tools[index];
			// Only a node tool names a node type, and only a node tool can embed an inline agent.
			if (tool.type !== 'node') continue;

			const own = toPolicedNodes([tool]);
			const ownRestriction = firstDenied(own);
			// An inline agent's own tools run under the tool that embeds them, so the parent carries
			// the issue: a violation names a type, never the entry that holds it. It reads as its own
			// reason, because the tool itself stays usable and editable — the fix is to open it and
			// drop the embedded tool.
			const restriction = ownRestriction ?? firstDenied(withInlineAgentToolNodes(own));
			if (!restriction) continue;

			issues.push(
				issue(
					'restricted_node_type',
					`tools.${index}.node.nodeType`,
					{ kind: 'tool', id: tool.name, index, toolType: 'node' },
					ownRestriction ? undefined : RESTRICTED_BY_INLINE_TOOL,
					restriction,
				),
			);
		}

		const servers = config.mcpServers ?? [];
		for (let index = 0; index < servers.length; index++) {
			const restriction = firstDenied(toPolicedMcpNodes([servers[index]]));
			if (!restriction) continue;

			issues.push(
				issue(
					'restricted_node_type',
					`mcpServers.${index}`,
					{ kind: 'mcpServer', id: servers[index].name, index },
					undefined,
					restriction,
				),
			);
		}
	}

	private async collectToolIssues(
		ctx: ConfigurationValidationContext,
		findCredential: FindCredential,
		workflowsByReference: Map<string, WorkflowEntity>,
		issues: AgentConfigValidationIssue[],
		scope: AgentValidationScope,
	) {
		const tools = ctx.config.tools ?? [];
		for (let index = 0; index < tools.length; index++) {
			const tool = tools[index];
			if (tool.enabled === false) continue;

			if (tool.type === 'custom') {
				this.collectCustomToolIssues(tool.id, index, ctx.customTools, issues);
				continue;
			}

			if (tool.type === 'workflow') {
				this.collectWorkflowToolIssues(tool, index, workflowsByReference, issues, scope);
				continue;
			}

			if (tool.type === 'node') {
				await this.collectNodeToolIssues(tool, index, findCredential, issues);
			}
		}
	}

	private collectWorkflowToolIssues(
		tool: AgentJsonWorkflowToolConfig,
		index: number,
		workflowsByReference: Map<string, WorkflowEntity>,
		issues: AgentConfigValidationIssue[],
		scope: AgentValidationScope,
	) {
		const path = `tools.${index}.${tool.workflowId === undefined ? 'workflow' : 'workflowId'}`;
		const capability: AgentConfigValidationIssue['capability'] = {
			kind: 'tool',
			id: tool.workflow,
			index,
			toolType: 'workflow',
		};

		const workflow = workflowsByReference.get(tool.workflowId ?? tool.workflow);

		if (!workflow) {
			issues.push(issue('missing_reference', path, capability));
			return;
		}

		const incompatibility = getWorkflowToolIncompatibilityReason(workflow);
		if (incompatibility) {
			issues.push(issue('incompatible_reference', path, capability, incompatibility.reason));
			return;
		}

		// Production runs load the published workflow version, so an unpublished
		// workflow blocks publishing the agent. Preview runs the draft and is not
		// affected, hence publish scope only.
		if (scope === 'publish' && !workflow.activeVersionId) {
			issues.push(issue('incompatible_reference', path, capability, 'not_published'));
		}
	}

	private async collectNodeToolIssues(
		tool: AgentJsonNodeToolConfig,
		index: number,
		findCredential: FindCredential,
		issues: AgentConfigValidationIssue[],
	) {
		const capabilityBase: AgentConfigValidationIssue['capability'] = {
			kind: 'tool',
			id: tool.name,
			index,
			toolType: 'node',
		};

		let nodeType;
		try {
			nodeType = this.nodeTypes.getByNameAndVersion(tool.node.nodeType, tool.node.nodeTypeVersion);
		} catch {
			issues.push(issue('missing_reference', `tools.${index}.node.nodeType`, capabilityBase));
			return;
		}

		// Materialize parameter defaults the same way the Workflow constructor
		// does, so validity mirrors how the tool will actually execute (e.g. an
		// absent `authentication` selector resolves to the node's default).
		const nodeParameters =
			NodeHelpers.getNodeParameters(
				nodeType.description.properties,
				(tool.node.nodeParameters ?? {}) as INodeParameters,
				true,
				false,
				{ typeVersion: tool.node.nodeTypeVersion },
				nodeType.description,
			) ?? {};
		const visibleSlots = this.getVisibleCredentialSlots(tool, nodeType.description, nodeParameters);
		for (const slot of visibleSlots) {
			await this.collectNodeCredentialIssues(
				tool,
				index,
				slot.credentialType,
				nodeParameters,
				findCredential,
				issues,
			);
		}
	}

	/**
	 * Whether the gateway covers this node-tool slot:
	 *  - `false` is a definitive no (feature disabled, or the config does not
	 *    cover the node/credential/action),
	 *  - `undefined` means it can't be determined (gateway enabled but its config
	 *    is unavailable, e.g. a transient fetch failure), so callers must not
	 *    fail closed on it: a briefly unreachable gateway must not make a
	 *    working managed slot look broken.
	 */
	private async gatewayCoversNodeToolSlot(
		node: AgentJsonNodeToolConfig['node'],
		credentialType: string,
		resolvedParameters: INodeParameters,
	): Promise<boolean | undefined> {
		const availability = await this.aiGatewayService.isAvailable();
		if (!availability.available) {
			return this.aiGatewayService.isEnabled() ? undefined : false;
		}
		return checkAiGatewayEligibility(
			{
				type: node.nodeType,
				typeVersion: node.nodeTypeVersion,
				parameters: (node.nodeParameters ?? {}) as INodeParameters,
			},
			credentialType,
			availability.config,
			resolvedParameters,
		).eligible;
	}

	private async collectMcpServerIssues(
		config: AgentJsonConfig,
		findCredential: FindCredential,
		issues: AgentConfigValidationIssue[],
	) {
		const servers = config.mcpServers ?? [];
		for (let index = 0; index < servers.length; index++) {
			const server = servers[index];
			const capability: AgentConfigValidationIssue['capability'] = {
				kind: 'mcpServer',
				id: server.name,
				index,
			};

			if (!server.url?.trim()) {
				issues.push(issue('missing_required', `mcpServers.${index}.url`, capability));
				continue;
			}

			if (server.authentication === 'none') continue;

			const credentialId = server.credential?.trim();
			if (!credentialId) {
				issues.push(issue('missing_credential', `mcpServers.${index}.credential`, capability));
				continue;
			}

			const credential = await this.findCredentialSafe(findCredential, credentialId);
			if (!credential) {
				issues.push(issue('invalid_credential', `mcpServers.${index}.credential`, capability));
			} else if (!this.mcpCredentialTypeMatches(server.authentication, credential.type)) {
				issues.push(issue('incompatible_credential', `mcpServers.${index}.credential`, capability));
			}
		}
	}

	private mcpCredentialTypeMatches(authentication: string, credentialType: string): boolean {
		switch (authentication) {
			case 'bearerAuth':
				return credentialType === 'httpBearerAuth';
			case 'headerAuth':
				return credentialType === 'httpHeaderAuth';
			case 'multipleHeadersAuth':
				return credentialType === 'httpMultipleHeadersAuth';
			case 'mcpOAuth2Api':
				return credentialType === 'mcpOAuth2Api';
			default:
				return isMcpOAuth2Authentication(authentication) ? credentialType === authentication : true;
		}
	}

	private credentialSupportsModel(credentialType: string, model: string) {
		const provider = getProviderPrefix(model);
		if (!provider) return false;
		return getAgentModelProviderCredentialTypes(provider).includes(credentialType);
	}

	/**
	 * Resolves a single credential without letting a `CredentialProvider.list()`
	 * failure abort validation of sibling credential paths. Callers treat the
	 * `undefined` result the same as "not found", surfacing an
	 * `invalid_credential` issue for that specific path.
	 */
	private async findCredentialSafe(
		findCredential: FindCredential,
		credentialId: string,
	): Promise<Awaited<ReturnType<CredentialProvider['list']>>[number] | undefined> {
		try {
			return await findCredential(credentialId);
		} catch {
			return undefined;
		}
	}

	/**
	 * Agents accept only Microsoft Foundry credentials for Azure OpenAI. This
	 * runs on publish only, so agents that already run on a Classic credential
	 * keep running.
	 */
	private async collectAzureEndpointIssues(
		config: AgentJsonConfig,
		credentialId: string,
		credentialProvider: CredentialProvider,
		issues: AgentConfigValidationIssue[],
	): Promise<void> {
		const model = config.model?.trim();
		if (!model || getProviderPrefix(model) !== 'azure-openai') return;
		let endpointType: unknown;
		try {
			const data = await credentialProvider.resolve(credentialId);
			endpointType = data?.endpointType;
		} catch {
			// A credential that can't be resolved here will already be reported
			// elsewhere; don't let a transient resolve failure block publish.
			return;
		}
		if (endpointType !== 'foundry') {
			issues.push(
				issue('incompatible_credential', 'credential', { kind: 'agent' }, 'azure_classic_endpoint'),
			);
		}
	}

	private collectCustomToolIssues(
		id: string,
		index: number,
		customTools: CustomToolEntries,
		issues: AgentConfigValidationIssue[],
	): void {
		if (customTools[id]) return;
		issues.push(
			issue('missing_reference', `tools.${index}.id`, {
				kind: 'tool',
				id,
				index,
				toolType: 'custom',
			}),
		);
	}

	private async collectNodeCredentialIssues(
		tool: AgentJsonNodeToolConfig,
		index: number,
		credentialType: string,
		nodeParameters: INodeParameters,
		findCredential: FindCredential,
		issues: AgentConfigValidationIssue[],
	): Promise<void> {
		const capabilityBase: AgentConfigValidationIssue['capability'] = {
			kind: 'tool',
			id: tool.name,
			index,
			toolType: 'node',
		};
		const path = `tools.${index}.node.credentials.${credentialType}`;
		const credentialRef = tool.node.credentials?.[credentialType];

		if (credentialRef && '__aiGatewayManaged' in credentialRef) {
			// Only flag a definitive "gateway does not cover this slot". An
			// indeterminate gateway state must not fail closed, mirroring the
			// managed main-credential policy in collectMainCredentialIssues.
			if (
				(await this.gatewayCoversNodeToolSlot(tool.node, credentialType, nodeParameters)) === false
			) {
				issues.push(issue('invalid_credential', path, capabilityBase));
			}
			return;
		}

		const credentialId = credentialRef?.id?.trim();

		if (!credentialId) {
			issues.push(issue('missing_credential', path, capabilityBase));
			return;
		}

		const credential = await this.findCredentialSafe(findCredential, credentialId);
		if (!credential || credential.type !== credentialType) {
			issues.push(issue('invalid_credential', path, capabilityBase));
		}
	}

	private getVisibleCredentialSlots(
		tool: AgentJsonNodeToolConfig,
		description: INodeTypeDescription,
		nodeParameters: INodeParameters,
	) {
		return getRequiredNodeCredentialSlots(description).filter((slot) => {
			const definition = description.credentials?.find(
				(credential) => credential.name === slot.credentialType,
			);
			return (
				!definition ||
				NodeHelpers.displayParameter(
					nodeParameters,
					definition,
					{ typeVersion: tool.node.nodeTypeVersion },
					description,
				)
			);
		});
	}
}
