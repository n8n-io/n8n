import { type CredentialProvider, type ToolDescriptor } from '@n8n/agents';
import { getProviderPrefix } from '@n8n/ai-utilities/agent-config';
import { getRequiredNodeCredentialSlots } from '@n8n/ai-utilities/node-catalog';
import {
	AgentModelSchema,
	agentTaskSchema,
	findVectorStoreToolNameCollisions,
	isDraftAgentConfig,
	isDraftIntegration,
	type AgentConfigValidationIssue,
	type AgentConfigValidationIssueCode,
	type AgentConfigValidationResponse,
	type AgentIntegrationConfig,
	type AgentJsonConfig,
	type AgentJsonNodeToolConfig,
	type AgentJsonWorkflowToolConfig,
	type AgentSkill,
} from '@n8n/api-types';
import { WorkflowRepository, type WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { isMcpOAuth2Authentication, NodeHelpers, type INodeParameters } from 'n8n-workflow';

import { getMissingSkillIds } from '@/modules/agents/utils/agent-missing-skill-ids';
import { NodeTypes } from '@/node-types';

import { LLM_PROVIDER_DEFAULTS } from './llm-provider-defaults';
import type { AgentHistory } from './entities/agent-history.entity';
import type { Agent } from './entities/agent.entity';
import { ChatIntegrationRegistry } from './integrations/agent-chat-integration';
import { isValidCronExpression } from './integrations/cron-validation';
import { AgentTaskSnapshotRepository } from './repositories/agent-task-snapshot.repository';
import { AgentTaskRepository } from './repositories/agent-task.repository';
import { AgentRepository } from './repositories/agent.repository';
import { detectTriggerNode, validateCompatibility } from './tools/workflow-tool-factory';
import { findWorkflowToolWorkflows } from './tools/workflow-tool-workflow-resolver';

type AgentValidationScope = 'runtime' | 'publish';

type FindCredential = (
	credentialId: string,
) => Promise<Awaited<ReturnType<CredentialProvider['list']>>[number] | undefined>;

type CustomToolEntries = Record<string, { code: string; descriptor: ToolDescriptor }>;
type TaskBody = { name: string; objective: string; cronExpression: string };

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
): AgentConfigValidationIssue {
	return { code, path, capability };
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
		private readonly agentTaskRepository: AgentTaskRepository,
		private readonly agentTaskSnapshotRepository: AgentTaskSnapshotRepository,
		private readonly nodeTypes: NodeTypes,
		private readonly workflowRepository: WorkflowRepository,
		private readonly chatIntegrationRegistry: ChatIntegrationRegistry,
	) {}

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

	async validateLoadedAgentConfiguration(
		agent: Agent,
		projectId: string,
		credentialProvider: CredentialProvider,
		scope: AgentValidationScope = 'publish',
	): Promise<AgentConfigValidationResponse> {
		const tasks =
			scope === 'publish'
				? new Map(
						(await this.agentTaskRepository.findByAgentId(agent.id)).map((task) => [task.id, task]),
					)
				: new Map<string, TaskBody>();

		return await this.validateAgentEntityConfiguration(
			agent,
			projectId,
			tasks,
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
		projectId: string,
		tasks: ReadonlyMap<string, TaskBody>,
		credentialProvider: CredentialProvider,
		scope: AgentValidationScope = 'publish',
		/**
		 * Validate against these integrations instead of `agent.integrations`.
		 * Used by connect-time publishes to exclude not-yet-connected draft
		 * entries (`credentialId: ''`) that would otherwise block publishing
		 * the channel currently being connected.
		 */
		integrationsOverride?: AgentIntegrationConfig[],
	): Promise<AgentConfigValidationResponse> {
		return await this.runValidation(
			{
				agentId: agent.id,
				projectId,
				config: agent.schema as unknown as AgentJsonConfig | null,
				skills: agent.skills ?? {},
				customTools: agent.tools ?? {},
				integrations: integrationsOverride ?? agent.integrations ?? [],
				tasks,
				credentialProvider,
			},
			scope,
		);
	}

	/**
	 * Same as {@link validateAgentConfiguration}, but against a specific
	 * published history snapshot instead of the live draft. Used before
	 * re-publishing a previously published version. Integrations are not
	 * versioned, so the agent's *current* integrations are always validated,
	 * regardless of which historical schema is checked.
	 */
	async validateAgentHistoryConfiguration(
		agentId: string,
		projectId: string,
		history: AgentHistory,
		currentIntegrations: AgentIntegrationConfig[],
		credentialProvider: CredentialProvider,
	): Promise<AgentConfigValidationResponse> {
		const tasks = new Map(
			(await this.agentTaskSnapshotRepository.findByVersionId(history.versionId)).map(
				(snapshot) => [snapshot.taskId, snapshot],
			),
		);

		return await this.runValidation(
			{
				agentId,
				projectId,
				config: history.schema as unknown as AgentJsonConfig | null,
				skills: history.skills ?? {},
				customTools: history.tools ?? {},
				integrations: currentIntegrations,
				tasks,
				credentialProvider,
			},
			'publish',
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
		return { status: issues.length === 0 ? 'valid' : 'invalid', issues };
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

		const { agentsById, workflowsByName } = await this.prefetchReferenceLookups(ctx);

		this.collectCoreIssues(config, issues);
		this.collectVectorStoreIssues(config, issues);
		await this.collectMainCredentialIssues(config, findCredential, issues);
		this.collectSubAgentRefIssues(ctx, agentsById, issues);
		this.collectSkillIssues(config, ctx.skills, issues);
		if (scope === 'publish') {
			this.collectTaskIssues(config, ctx.tasks, issues);
			await this.collectChannelIssues(ctx.integrations, findCredential, issues);
		}
		await this.collectToolIssues(ctx, findCredential, workflowsByName, issues);
		await this.collectMcpServerIssues(config, findCredential, issues);

		return this.dedupe(issues);
	}

	private async prefetchReferenceLookups(ctx: ConfigurationValidationContext): Promise<{
		agentsById: Map<string, Pick<Agent, 'id' | 'activeVersionId'>>;
		workflowsByName: Map<string, WorkflowEntity>;
	}> {
		const subAgentIds = new Set<string>();
		const workflowNames = new Set<string>();

		for (const ref of ctx.config.subAgents?.agents ?? []) {
			if (ref.agentId && ref.agentId !== ctx.agentId) {
				subAgentIds.add(ref.agentId);
			}
		}

		for (const tool of ctx.config.tools ?? []) {
			if (tool.type === 'workflow' && tool.workflow) {
				workflowNames.add(tool.workflow);
			}
		}

		const [agents, workflowsByName] = await Promise.all([
			this.agentRepository.findByIdsAndProjectId([...subAgentIds], ctx.projectId),
			findWorkflowToolWorkflows(this.workflowRepository, [...workflowNames], ctx.projectId),
		]);

		return {
			agentsById: new Map(agents.map((agent) => [agent.id, agent])),
			workflowsByName,
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
		issues: AgentConfigValidationIssue[],
	) {
		if (!config.credential?.trim()) {
			issues.push(agentIssue('missing_credential', 'credential'));
			return;
		}

		const credentialId = config.credential.trim();
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
	}

	private collectSubAgentRefIssues(
		ctx: ConfigurationValidationContext,
		agentsById: Map<string, Pick<Agent, 'id' | 'activeVersionId'>>,
		issues: AgentConfigValidationIssue[],
	) {
		const refs = ctx.config.subAgents?.agents ?? [];
		for (let index = 0; index < refs.length; index++) {
			const ref = refs[index];
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
				continue;
			}

			if (!target.activeVersionId) {
				issues.push(issue('incompatible_reference', path, capability));
			}
		}
	}

	private collectSkillIssues(
		config: AgentJsonConfig,
		skills: Record<string, AgentSkill>,
		issues: AgentConfigValidationIssue[],
	) {
		for (const skillId of getMissingSkillIds(config, skills)) {
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

	private async collectToolIssues(
		ctx: ConfigurationValidationContext,
		findCredential: FindCredential,
		workflowsByName: Map<string, WorkflowEntity>,
		issues: AgentConfigValidationIssue[],
	) {
		const tools = ctx.config.tools ?? [];
		for (let index = 0; index < tools.length; index++) {
			const tool = tools[index];

			if (tool.type === 'custom') {
				if (!ctx.customTools[tool.id]) {
					issues.push(
						issue('missing_reference', `tools.${index}.id`, {
							kind: 'tool',
							id: tool.id,
							index,
							toolType: 'custom',
						}),
					);
				}
				continue;
			}

			if (tool.type === 'workflow') {
				this.collectWorkflowToolIssues(tool, index, workflowsByName, issues);
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
		workflowsByName: Map<string, WorkflowEntity>,
		issues: AgentConfigValidationIssue[],
	) {
		const path = `tools.${index}.workflow`;
		const capability: AgentConfigValidationIssue['capability'] = {
			kind: 'tool',
			id: tool.name ?? tool.workflow,
			index,
			toolType: 'workflow',
		};

		const workflow = workflowsByName.get(tool.workflow);

		if (!workflow) {
			issues.push(issue('missing_reference', path, capability));
			return;
		}

		try {
			validateCompatibility(workflow);
			detectTriggerNode(workflow);
		} catch {
			issues.push(issue('incompatible_reference', path, capability));
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
		const requiredSlots = getRequiredNodeCredentialSlots(nodeType.description);
		for (const slot of requiredSlots) {
			const credentialDefinition = nodeType.description.credentials?.find(
				(credential) => credential.name === slot.credentialType,
			);

			if (
				credentialDefinition &&
				!NodeHelpers.displayParameter(
					nodeParameters,
					credentialDefinition,
					{ typeVersion: tool.node.nodeTypeVersion },
					nodeType.description,
				)
			) {
				continue;
			}

			const path = `tools.${index}.node.credentials.${slot.credentialType}`;
			const credentialRef = tool.node.credentials?.[slot.credentialType];
			const credentialId = credentialRef?.id?.trim();

			if (!credentialId) {
				issues.push(issue('missing_credential', path, capabilityBase));
				continue;
			}

			const credential = await this.findCredentialSafe(findCredential, credentialId);
			if (!credential || credential.type !== slot.credentialType) {
				issues.push(issue('invalid_credential', path, capabilityBase));
			}
		}
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
			default:
				return isMcpOAuth2Authentication(authentication) ? credentialType === authentication : true;
		}
	}

	private credentialSupportsModel(credentialType: string, model: string) {
		return LLM_PROVIDER_DEFAULTS[credentialType]?.provider === getProviderPrefix(model);
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
}
