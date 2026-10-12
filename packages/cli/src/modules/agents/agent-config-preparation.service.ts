import { reconcileNativeWebSearch } from '@n8n/ai-utilities/agent-config';
import {
	AgentJsonConfigSchema,
	findVectorStoreToolNameCollisions,
	formatAgentConfigZodError,
	sanitizeAgentJsonConfig,
	type AgentJsonConfig,
} from '@n8n/api-types';
import { WorkflowRepository, type User } from '@n8n/db';
import { ProjectScopeService } from '@n8n/backend-services';
import { Container, Service } from '@n8n/di';
import { ForbiddenError } from '@n8n/errors';
import { isRecord } from '@n8n/utils/is-record';
import { getStaticSubworkflowId, UserError } from 'n8n-workflow';

import { CredentialsService } from '@/credentials/credentials.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { NodeToolAiGatewayService } from './json-config/node-tool-ai-gateway.service';
import { sanitizeUnknownAgentCredentials } from './json-config/sanitize-unknown-agent-credentials';
import { AgentRepository } from './repositories/agent.repository';
import {
	findWorkflowToolWorkflows,
	normalizeWorkflowToolRefs,
} from './tools/workflow-tool-workflow-resolver';
import { createAgentCredentialProvider } from './utils/agent-credential-provider';
import type { CompleteAgentDefinition, PlannedAgentDestinations } from './utils/agent-definition';
import { extractAgentWorkflowRefs } from './utils/extract-agent-workflow-refs';
import { visitAgentCredentialReferences } from './utils/visit-agent-credential-references';
import {
	findHttpRequestToolUrlFromAiViolations,
	validateNodeToolConfigs,
	validateNodeToolExpressions,
} from './utils/node-tool-validation';

@Service()
export class AgentConfigPreparationService {
	constructor(
		private readonly credentialsService: CredentialsService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly nodeToolAiGatewayService: NodeToolAiGatewayService,
	) {}

	async assertCanSaveDefinition(projectId: string, user: User, action: 'create' | 'update') {
		const projects = await Container.get(ProjectScopeService).getProjectIds(user, [
			'agent:read',
			`agent:${action}`,
		]);
		if (projects !== null && !projects.includes(projectId)) {
			throw new ForbiddenError('You do not have permission to save Agents in this project.');
		}
	}

	/** Use the same body and configuration checks for planning and complete saves. */
	async validateDefinition(
		agentId: string,
		definition: CompleteAgentDefinition,
	): Promise<CompleteAgentDefinition> {
		const [{ AgentSkillsService }, { AgentCustomToolsService }, { AgentTaskService }] =
			await Promise.all([
				import('./agent-skills.service.js'),
				import('./agent-custom-tools.service.js'),
				import('./agent-task.service.js'),
			]);
		Container.get(AgentSkillsService).validateSkills(Object.values(definition.skills));
		for (const tool of Object.values(definition.tools)) {
			Container.get(AgentCustomToolsService).validateDescriptor(tool.descriptor);
		}
		const tasks = Container.get(AgentTaskService);
		tasks.validateTasks([...definition.tasks.values()]);
		if (definition.tasks.size > 0) tasks.assertAgentHasConfig(definition.config !== null);
		const prepared = structuredClone(definition);
		if (prepared.config === null) return prepared;
		const result = await this.validateConfig(prepared.config);
		if (!result.valid) throw new UserError(result.error);
		prepared.config = reconcileNativeWebSearch(result.config);
		this.validateSubAgentRefs(prepared.config.subAgents?.agents ?? [], agentId);
		const references = [
			['skills', prepared.config.skills ?? [], new Set(Object.keys(prepared.skills))],
			[
				'tools',
				prepared.config.tools?.filter((tool) => tool.type === 'custom') ?? [],
				new Set(Object.keys(prepared.tools)),
			],
			['tasks', prepared.config.tasks ?? [], new Set(prepared.tasks.keys())],
		] as const;
		for (const [kind, refs, ids] of references) {
			for (const { id } of refs) {
				if (!ids.has(id))
					throw new UserError(`Agent references ${kind} asset "${id}" without a body.`);
			}
		}
		return prepared;
	}

	/** Complete saves reject missing references. Editor repair must not erase bound content. */
	async prepareDefinition(
		agentId: string,
		definition: CompleteAgentDefinition,
		projectId: string,
		user: User,
		planned: PlannedAgentDestinations = {},
	) {
		const prepared = await this.validateDefinition(agentId, definition);
		const credentialProvider = createAgentCredentialProvider(
			this.credentialsService,
			projectId,
			user,
		);
		if (prepared.config !== null) {
			const accessibleIds = new Set((await credentialProvider.list()).map(({ id }) => id));
			visitAgentCredentialReferences(prepared.config, ({ id, path, managedToken }) => {
				if (id && id !== managedToken && !accessibleIds.has(id)) {
					throw new UserError(
						`Credential "${id}" at ${path.join('.')} is missing or inaccessible.`,
					);
				}
			});
			await this.validateAgentDestinations(prepared.config, projectId, user, planned);
			await normalizeWorkflowToolRefs(this.workflowRepository, prepared.config, projectId);
			await this.validateWorkflowDestinations(prepared.config, projectId, user, planned);
		}
		return { definition: prepared, credentialProvider };
	}

	validateSubAgentRefs(refs: Array<{ agentId: string }>, ownerAgentId: string): void {
		if (refs.some(({ agentId }) => agentId === ownerAgentId)) {
			throw new UserError('Invalid agent config: An agent cannot use itself as a subagent');
		}
	}

	private async validateAgentDestinations(
		config: AgentJsonConfig,
		projectId: string,
		user: User,
		planned: PlannedAgentDestinations,
	): Promise<void> {
		const ids = (config.subAgents?.agents ?? []).map(({ agentId }) => agentId);
		if (ids.length === 0) return;
		const existing = new Map(
			(await Container.get(AgentRepository).findImportIdOwners(ids)).map((agent) => [
				agent.id,
				agent.projectId,
			]),
		);
		for (const id of ids) {
			if (existing.has(id)) {
				if (existing.get(id) === projectId) continue;
			} else if (planned.agents?.get(id) === projectId) {
				await this.assertCanSaveDefinition(projectId, user, 'create');
				continue;
			}
			throw new UserError(`Subagent "${id}" is missing or inaccessible in this project.`);
		}
	}

	private async validateWorkflowDestinations(
		config: AgentJsonConfig,
		projectId: string,
		user: User,
		planned: PlannedAgentDestinations,
	): Promise<void> {
		const refs = extractAgentWorkflowRefs(config);
		const workflows = await findWorkflowToolWorkflows(this.workflowRepository, refs, projectId);
		const localIds = refs.map(
			(ref) => workflows.get(ref.workflowId ?? ref.workflow)?.id ?? ref.workflowId,
		);
		if (localIds.some((id) => !id))
			throw new UserError('A workflow tool references a missing workflow.');
		const ids = new Set(localIds.filter((id): id is string => id !== undefined));
		const projectLocal = new Set(ids);
		for (const tool of config.tools ?? []) {
			if (tool.type !== 'node') continue;
			const id = getStaticSubworkflowId({
				type: tool.node.nodeType,
				parameters: tool.node.nodeParameters,
			});
			if (id) ids.add(id);
		}
		if (ids.size === 0) return;
		const finder = Container.get(WorkflowFinderService);
		const readable = await finder.findWorkflowIdsWithScopeForUser([...ids], user, [
			'workflow:read',
		]);
		const local = await finder.findWorkflowIdsWithScopeForUser(
			[...projectLocal],
			user,
			['workflow:read'],
			projectId,
		);
		const existing = await finder.findExistingWorkflowIds([...ids]);
		for (const id of ids) {
			if (readable.has(id) && (!projectLocal.has(id) || local.has(id))) continue;
			const destination = planned.workflows?.get(id);
			if (
				!existing.has(id) &&
				destination &&
				(!projectLocal.has(id) || destination === projectId)
			) {
				const projects = await Container.get(ProjectScopeService).getProjectIds(user, [
					'workflow:read',
					'workflow:create',
				]);
				if (projects === null || projects.includes(destination)) continue;
			}
			throw new UserError(`Workflow "${id}" is missing or inaccessible.`);
		}
	}

	async prepareConfig(config: unknown, projectId: string, user: User) {
		const credentialProvider = createAgentCredentialProvider(
			this.credentialsService,
			projectId,
			user,
		);
		const accessibleCredentials = await credentialProvider.list();
		const accessibleCredentialIds = new Set(
			accessibleCredentials.map((credential) => credential.id),
		);
		const sanitizedBaseConfig = sanitizeAgentJsonConfig(config);
		const sanitizedConfig = sanitizeUnknownAgentCredentials(
			sanitizedBaseConfig,
			accessibleCredentialIds,
		);

		const result = await this.validateConfig(sanitizedConfig);
		if (!result.valid) {
			throw new UserError(`Invalid agent config: ${result.error}`);
		}

		// Keep persisted provider tools consistent with the web-search settings.
		const validatedConfig = reconcileNativeWebSearch(result.config);

		if (validatedConfig.tools !== undefined) {
			await this.nodeToolAiGatewayService.assignManagedCredentials(
				validatedConfig.tools.filter((tool) => tool.enabled !== false),
				new Set(accessibleCredentials.map((credential) => credential.type)),
			);
		}
		await normalizeWorkflowToolRefs(this.workflowRepository, validatedConfig, projectId);

		return { validatedConfig, credentialProvider };
	}

	/** Validate the config shape and the node tool schemas. */
	async validateConfig(
		raw: unknown,
	): Promise<{ valid: true; config: AgentJsonConfig } | { valid: false; error: string }> {
		if (hasNodeToolInputSchema(raw)) {
			return { valid: false, error: 'Node tool configs must not include inputSchema.' };
		}

		const parsed = AgentJsonConfigSchema.safeParse(sanitizeAgentJsonConfig(raw));
		if (!parsed.success) {
			return { valid: false, error: formatAgentConfigZodError(parsed.error) };
		}

		const config = parsed.data;

		const toolNameCollisions = findVectorStoreToolNameCollisions(config);
		if (toolNameCollisions.length > 0) {
			return {
				valid: false,
				error: `Vector store tool name collides with an existing tool: ${toolNameCollisions.join(', ')}`,
			};
		}

		try {
			validateNodeToolExpressions(config.tools);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return {
				valid: false,
				error: `Invalid $fromAI expression in node tool config: ${message}`,
			};
		}

		const urlViolations = findHttpRequestToolUrlFromAiViolations(config.tools).filter(
			({ toolIndex }) => config.tools?.[toolIndex].enabled !== false,
		);
		if (urlViolations.length > 0) {
			return {
				valid: false,
				error: urlViolations
					.map(
						({ toolName, path }) =>
							`HTTP Request tool "${toolName}" cannot use $fromAI in ${path}. Enter a fixed URL.`,
					)
					.join('\n'),
			};
		}

		const nodeError = await validateNodeToolConfigs(config.tools);
		if (nodeError) {
			return { valid: false, error: nodeError };
		}

		return { valid: true, config };
	}
}

function hasNodeToolInputSchema(raw: unknown): boolean {
	if (!isRecord(raw) || !Array.isArray(raw.tools)) return false;

	return raw.tools.some((tool) => isRecord(tool) && tool.type === 'node' && 'inputSchema' in tool);
}
