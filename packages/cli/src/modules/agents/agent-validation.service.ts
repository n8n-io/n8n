import { type CredentialProvider, type ToolDescriptor } from '@n8n/agents';
import { getProviderPrefix } from '@n8n/ai-utilities/agent-config';
import {
	detectAuthenticationParameterValue,
	getRequiredNodeCredentialSlots,
} from '@n8n/ai-utilities/node-catalog';
import {
	AGENT_VECTOR_STORE_CREDENTIAL_TYPES,
	AgentModelSchema,
	MANAGED_CREDENTIAL_TOKEN,
	SUB_AGENT_TASK_DIFFICULTIES,
	agentTaskSchema,
	type AgentCapabilityKind,
	type AgentConfigValidationIssue,
	type AgentConfigValidationIssueCode,
	type AgentConfigValidationResponse,
	type AgentIntegrationConfig,
	type AgentJsonConfig,
	type AgentJsonNodeToolConfig,
	type AgentJsonWorkflowToolConfig,
	type AgentSkill,
} from '@n8n/api-types';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { NodeHelpers, type INodeParameters } from 'n8n-workflow';

import { LLM_PROVIDER_DEFAULTS } from './builder/interactive/llm-provider-defaults';
import type { AgentHistory } from './entities/agent-history.entity';
import { ChatIntegrationRegistry } from './integrations/agent-chat-integration';
import { isValidCronExpression } from './integrations/cron-validation';
import { AgentTaskSnapshotRepository } from './repositories/agent-task-snapshot.repository';
import { AgentTaskRepository } from './repositories/agent-task.repository';
import { AgentRepository } from './repositories/agent.repository';
import { detectTriggerNode, validateCompatibility } from './tools/workflow-tool-factory';
import { NodeTypes } from '@/node-types';
import { AiService } from '@/services/ai.service';
import { getMissingSkillIds } from '@/modules/agents/utils/agent-missing-skill-ids';

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

function memoryIssue(
	code: AgentConfigValidationIssueCode,
	path: string,
): AgentConfigValidationIssue {
	return issue(code, path, { kind: 'memory' });
}

@Service()
export class AgentValidationService {
	constructor(
		private readonly agentRepository: AgentRepository,
		private readonly aiService: AiService,
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
	): Promise<AgentConfigValidationResponse> {
		const agentEntity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agentEntity) {
			return { status: 'invalid', issues: [agentIssue('missing_required', 'agent')] };
		}

		const config = agentEntity.schema as unknown as AgentJsonConfig | null;
		if (!config) {
			return { status: 'invalid', issues: this.missingConfigIssues() };
		}

		const tasks = new Map(
			(await this.agentTaskRepository.findByAgentId(agentId)).map((task) => [task.id, task]),
		);

		const issues = await this.collectIssues({
			agentId,
			projectId,
			config,
			skills: agentEntity.skills ?? {},
			customTools: agentEntity.tools ?? {},
			integrations: agentEntity.integrations ?? [],
			tasks,
			credentialProvider,
		});

		return { status: issues.length === 0 ? 'valid' : 'invalid', issues };
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
		const config = history.schema as unknown as AgentJsonConfig | null;
		if (!config) {
			return { status: 'invalid', issues: this.missingConfigIssues() };
		}

		const tasks = new Map(
			(await this.agentTaskSnapshotRepository.findByVersionId(history.versionId)).map(
				(snapshot) => [snapshot.taskId, snapshot],
			),
		);

		const issues = await this.collectIssues({
			agentId,
			projectId,
			config,
			skills: history.skills ?? {},
			customTools: history.tools ?? {},
			integrations: currentIntegrations,
			tasks,
			credentialProvider,
		});

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
	): Promise<AgentConfigValidationIssue[]> {
		const { config } = ctx;
		const issues: AgentConfigValidationIssue[] = [];

		let credentialList: Awaited<ReturnType<CredentialProvider['list']>> | undefined;
		const findCredential: FindCredential = async (credentialId) => {
			credentialList ??= await ctx.credentialProvider.list();
			return credentialList.find((credential) => credential.id === credentialId);
		};

		this.collectCoreIssues(config, issues);
		await this.collectMainCredentialIssues(config, findCredential, issues);
		await this.collectMemoryIssues(config, findCredential, issues);
		await this.collectWebSearchIssues(config, findCredential, issues);
		await this.collectVectorStoreIssues(config, findCredential, issues);
		await this.collectSubAgentDifficultyModelIssues(config, findCredential, issues);
		await this.collectSubAgentRefIssues(ctx, issues);
		this.collectSkillIssues(config, ctx.skills, issues);
		this.collectTaskIssues(config, ctx.tasks, issues);
		await this.collectChannelIssues(ctx.integrations, findCredential, issues);
		await this.collectToolIssues(ctx, findCredential, issues);
		await this.collectMcpServerIssues(config, findCredential, issues);

		return this.dedupe(issues);
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

		if (!config.model?.trim()) {
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
		if (!(await this.findCredentialSafe(findCredential, credentialId))) {
			issues.push(agentIssue('invalid_credential', 'credential'));
		}
	}

	private async collectMemoryIssues(
		config: AgentJsonConfig,
		findCredential: FindCredential,
		issues: AgentConfigValidationIssue[],
	) {
		if (!config.memory?.enabled) return;

		await this.validateMemoryWorkerModel(
			config.memory.observationalMemory?.observerModel,
			'memory.observationalMemory.observerModel',
			'memory',
			findCredential,
			issues,
		);
		await this.validateMemoryWorkerModel(
			config.memory.observationalMemory?.reflectorModel,
			'memory.observationalMemory.reflectorModel',
			'memory',
			findCredential,
			issues,
		);

		const episodicMemory = config.memory.episodicMemory;
		if (episodicMemory?.enabled === true) {
			const episodicCredentialId = episodicMemory.credential?.trim();
			const isManagedEmbeddingCredential =
				episodicCredentialId === MANAGED_CREDENTIAL_TOKEN && this.aiService.isProxyEnabled();
			if (!isManagedEmbeddingCredential) {
				if (!episodicCredentialId) {
					issues.push(memoryIssue('missing_credential', 'episodicMemory.credential'));
				} else if (!(await this.findCredentialSafe(findCredential, episodicCredentialId))) {
					issues.push(memoryIssue('invalid_credential', 'episodicMemory.credential'));
				}
			}
			await this.validateMemoryWorkerModel(
				episodicMemory.extractorModel,
				'memory.episodicMemory.extractorModel',
				'memory',
				findCredential,
				issues,
			);
			await this.validateMemoryWorkerModel(
				episodicMemory.reflectorModel,
				'memory.episodicMemory.reflectorModel',
				'memory',
				findCredential,
				issues,
			);
		}
	}

	private async collectWebSearchIssues(
		config: AgentJsonConfig,
		findCredential: FindCredential,
		issues: AgentConfigValidationIssue[],
	) {
		const webSearch = config.config?.webSearch;
		if (
			!webSearch?.enabled ||
			(webSearch.provider !== 'brave' && webSearch.provider !== 'searxng')
		) {
			return;
		}

		const webSearchCredentialId = webSearch.credential?.trim();
		if (!webSearchCredentialId) {
			issues.push(issue('missing_credential', 'webSearch.credential', { kind: 'webSearch' }));
			return;
		}

		if (!(await this.findCredentialSafe(findCredential, webSearchCredentialId))) {
			issues.push(issue('invalid_credential', 'webSearch.credential', { kind: 'webSearch' }));
		}
	}

	private async collectVectorStoreIssues(
		config: AgentJsonConfig,
		findCredential: FindCredential,
		issues: AgentConfigValidationIssue[],
	) {
		for (const vectorStore of config.vectorStores ?? []) {
			const credentialPath = `vectorStores.${vectorStore.name}.credential`;
			const credentialCapability: AgentConfigValidationIssue['capability'] = {
				kind: 'vectorStore',
				id: vectorStore.name,
			};
			const credentialId = vectorStore.credential?.trim();
			if (!credentialId) {
				issues.push(issue('missing_credential', credentialPath, credentialCapability));
			} else {
				const credential =
					credentialId !== MANAGED_CREDENTIAL_TOKEN
						? await this.findCredentialSafe(findCredential, credentialId)
						: undefined;
				if (!credential) {
					issues.push(issue('invalid_credential', credentialPath, credentialCapability));
				} else if (credential.type !== AGENT_VECTOR_STORE_CREDENTIAL_TYPES[vectorStore.provider]) {
					issues.push(issue('incompatible_credential', credentialPath, credentialCapability));
				}
			}

			const embeddingCredentialId = vectorStore.embedding.credential?.trim();
			if (!embeddingCredentialId) {
				issues.push(
					issue('missing_credential', `vectorStores.${vectorStore.name}.embedding.credential`, {
						kind: 'vectorStore',
						id: vectorStore.name,
					}),
				);
			} else if (!(await this.findCredentialSafe(findCredential, embeddingCredentialId))) {
				issues.push(
					issue('invalid_credential', `vectorStores.${vectorStore.name}.embedding.credential`, {
						kind: 'vectorStore',
						id: vectorStore.name,
					}),
				);
			}
		}
	}

	private async collectSubAgentDifficultyModelIssues(
		config: AgentJsonConfig,
		findCredential: FindCredential,
		issues: AgentConfigValidationIssue[],
	) {
		const modelsByDifficulty = config.subAgents?.modelsByDifficulty;
		if (!modelsByDifficulty) return;

		for (const difficulty of SUB_AGENT_TASK_DIFFICULTIES) {
			await this.validateMemoryWorkerModel(
				modelsByDifficulty[difficulty],
				`subAgents.modelsByDifficulty.${difficulty}`,
				'subAgent',
				findCredential,
				issues,
				difficulty,
			);
		}
	}

	private async collectSubAgentRefIssues(
		ctx: ConfigurationValidationContext,
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

			const target = await this.agentRepository.findByIdAndProjectId(ref.agentId, ctx.projectId);
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
			if (!ref.enabled) continue;
			const task = tasks.get(ref.id);
			if (!task) {
				issues.push(
					issue('missing_reference', `tasks.${index}.id`, { kind: 'task', id: ref.id, index }),
				);
			} else if (
				!agentTaskSchema.safeParse(task).success ||
				!isValidCronExpression(task.cronExpression)
			) {
				issues.push(issue('invalid_value', `tasks.${index}`, { kind: 'task', id: ref.id, index }));
			}
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
			const credentialId = integration.credentialId?.trim();

			if (!credentialId) {
				issues.push(issue('missing_credential', path, capability));
				continue;
			}

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
				await this.collectWorkflowToolIssues(tool, index, ctx.projectId, issues);
				continue;
			}

			if (tool.type === 'node') {
				await this.collectNodeToolIssues(tool, index, findCredential, issues);
			}
		}
	}

	private async collectWorkflowToolIssues(
		tool: AgentJsonWorkflowToolConfig,
		index: number,
		projectId: string,
		issues: AgentConfigValidationIssue[],
	) {
		const path = `tools.${index}.workflow`;
		const capability: AgentConfigValidationIssue['capability'] = {
			kind: 'tool',
			id: tool.name ?? tool.workflow,
			index,
			toolType: 'workflow',
		};

		const workflow = await this.workflowRepository.findOne({
			where: { name: tool.workflow, shared: { projectId } },
			relations: ['shared'],
		});

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

		const nodeParameters = (tool.node.nodeParameters ?? {}) as INodeParameters;
		const requiredSlots = getRequiredNodeCredentialSlots(nodeType.description);
		for (const slot of requiredSlots) {
			const credentialDefinition = nodeType.description.credentials?.find(
				(credential) => credential.name === slot.credentialType,
			);

			let displayParameters = nodeParameters;
			if (!nodeParameters.authentication) {
				const detectedAuthentication = detectAuthenticationParameterValue(
					nodeType.description,
					slot.credentialType,
				);
				if (detectedAuthentication) {
					displayParameters = { ...nodeParameters, authentication: detectedAuthentication };
				}
			}

			if (
				credentialDefinition &&
				!NodeHelpers.displayParameter(
					displayParameters,
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

			if (!(await this.findCredentialSafe(findCredential, credentialId))) {
				issues.push(issue('invalid_credential', `mcpServers.${index}.credential`, capability));
			}
		}
	}

	private async validateMemoryWorkerModel(
		modelConfig: { model?: string | null; credential?: string | null } | string | null | undefined,
		path: string,
		capabilityKind: AgentCapabilityKind,
		findCredential: FindCredential,
		issues: AgentConfigValidationIssue[],
		capabilityId?: string,
	) {
		if (modelConfig === undefined || modelConfig === null) return;
		const capability: AgentConfigValidationIssue['capability'] = capabilityId
			? { kind: capabilityKind, id: capabilityId }
			: { kind: capabilityKind };

		if (typeof modelConfig === 'string') {
			issues.push(issue('missing_credential', `${path}.credential`, capability));
			return;
		}

		if (!modelConfig.model?.trim()) {
			issues.push(issue('missing_required', `${path}.model`, capability));
		} else if (!AgentModelSchema.safeParse(modelConfig.model).success) {
			issues.push(issue('invalid_value', `${path}.model`, capability));
		}

		const credentialId = modelConfig.credential?.trim();
		if (!credentialId) {
			issues.push(issue('missing_credential', `${path}.credential`, capability));
			return;
		}

		const credential = await this.findCredentialSafe(findCredential, credentialId);
		if (!credential) {
			issues.push(issue('invalid_credential', `${path}.credential`, capability));
		} else if (!this.workerCredentialSupportsModel(credential.type, modelConfig.model ?? '')) {
			issues.push(issue('incompatible_credential', `${path}.credential`, capability));
		}
	}

	private workerCredentialSupportsModel(credentialType: string, model: string) {
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
