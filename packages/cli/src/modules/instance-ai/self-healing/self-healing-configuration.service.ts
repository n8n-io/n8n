import {
	isSelfHealingAgentTriggerMissing,
	normalizeSelfHealingAgentGoals,
	type SaveSelfHealingConfigurationDto,
	type SelfHealingConfigurationOptions,
	type SelfHealingStatusDto,
	type UpdateSelfHealingConfigurationDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { RoleService, type RoleLoader, TelemetryProxy } from '@n8n/backend-services';
import {
	ProjectRelationRepository,
	ProjectRepository,
	RoleRepository,
	SharedWorkflowRepository,
	TransactionRunner,
	UserRepository,
	type OperationContext,
	type User,
} from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '@n8n/errors';
import { PROJECT_OWNER_ROLE_SLUG, type Scope } from '@n8n/permissions';
import { TELEMETRY_EVENT, type InferTelemetryProps } from '@n8n/telemetry';

import { userHasScopes } from '@/permissions.ee/check-access';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { afterCommit, runInTransaction } from '../after-commit';
import { SelfHealingAgentInvestigationRepository } from './agents/database/self-healing-agent-investigation.repository';
import { SelfHealingConfiguration } from './database/self-healing-configuration.entity';
import {
	SelfHealingConfigurationRepository,
	type ReviewerRoles,
} from './database/self-healing-configuration.repository';
import { SelfHealingInvestigationRepository } from './database/self-healing-investigation.repository';

export const REVIEWER_SCOPES: Scope[] = ['workflow:read', 'workflow:update'];
const ACTOR_SCOPES: Scope[] = ['workflow:read', 'workflow:update', 'execution:read'];
export const AGENT_REVIEWER_SCOPES: Scope[] = ['agent:read', 'agent:update'];
const AGENT_ACTOR_SCOPES: Scope[] = ['agent:read', 'agent:update', 'agent:execute'];
/** Automatic publication also needs this scope. */
const AGENT_PUBLISH_SCOPES: Scope[] = ['agent:publish'];

type ConfigurationChange = InferTelemetryProps<
	typeof TELEMETRY_EVENT.SELF_HEALING.INSTANCE_CHANGED_SELF_HEALING_CONFIGURATION
>;

const NO_ELIGIBLE_REVIEWER =
	'No reviewer can edit these workflows. Add a reviewer who can edit them, or give a reviewer edit access.';
const AGENTS_NOT_AVAILABLE = 'Agents are not available on this instance.';
const NO_ELIGIBLE_AGENT_REVIEWER =
	'No reviewer can edit these agents. Add a reviewer who can edit them, or give a reviewer edit access.';

/** What the user may authorize in the project. */
type ActorAccess = { workflows: boolean; agents: boolean; agentPublish: boolean };
const NO_ACTOR_ACCESS: ActorAccess = { workflows: false, agents: false, agentPublish: false };

/** The kinds that a configuration covers. `auto` applies only to agents. */
type Coverage = { workflows: boolean; agents: boolean; auto: boolean };

type AgentSelection = Pick<UpdateSelfHealingConfigurationDto, 'agentScope' | 'agentIds'>;

function selectedAgentIds({ agentScope, agentIds }: AgentSelection) {
	return agentScope === 'selected' ? [...new Set(agentIds)] : [];
}

function inputCoverage(input: UpdateSelfHealingConfigurationDto): Coverage {
	return {
		workflows: input.scope === 'all' || input.workflowIds.length > 0,
		agents: input.agentScope !== 'none',
		auto: input.agentPublicationMode === 'auto',
	};
}

@Service()
export class SelfHealingConfigurationService {
	constructor(
		private readonly configurations: SelfHealingConfigurationRepository,
		private readonly workflows: WorkflowFinderService,
		private readonly ownership: SharedWorkflowRepository,
		private readonly projectRelations: ProjectRelationRepository,
		private readonly projects: ProjectRepository,
		private readonly users: UserRepository,
		private readonly roles: RoleService,
		private readonly roleRepository: RoleRepository,
		private readonly transactionRunner: TransactionRunner,
		private readonly investigations: SelfHealingInvestigationRepository,
		private readonly agentInvestigations: SelfHealingAgentInvestigationRepository,
		private readonly logger: Logger,
		private readonly telemetry: TelemetryProxy,
	) {}

	private trackChange(
		configuration: SelfHealingConfiguration,
		change: ConfigurationChange['change'],
		details: {
			actorId?: string;
			reason?: ConfigurationChange['reason'];
			selections?: Pick<UpdateSelfHealingConfigurationDto, 'workflowIds' | 'reviewerIds'>;
		} = {},
	) {
		const { reason = null, selections } = details;
		// A system pause is attributed to the user who enabled the configuration.
		const userId = details.actorId ?? configuration.enabledById;
		this.telemetry.track(TELEMETRY_EVENT.SELF_HEALING.INSTANCE_CHANGED_SELF_HEALING_CONFIGURATION, {
			configuration_id: configuration.id,
			project_id: configuration.projectId,
			change,
			reason,
			...(userId ? { user_id: userId } : {}),
			enabled: configuration.enabled,
			enabled_by_id: configuration.enabledById,
			scope: configuration.scope,
			include_sub_workflows: configuration.includeSubWorkflows,
			include_all_project_members: configuration.includeAllProjectMembers,
			reviewer_count: selections ? new Set(selections.reviewerIds).size : null,
			selected_workflow_count: selections ? new Set(selections.workflowIds).size : null,
		});
	}

	async afterWorkflowsTransferred(workflowIds: string[]): Promise<void> {
		await this.configurations.removeWorkflowSelections(workflowIds);
	}

	async canConfigure(user: User, projectId: string) {
		const [project] = await this.projects.findTypesByIds([projectId]);
		if (project?.type !== 'personal') {
			return await userHasScopes(user, ['project:update'], false, { projectId });
		}

		const [relation] = await this.projectRelations.findByUserAndProjects(user.id, [projectId]);
		return relation?.role.slug === PROJECT_OWNER_ROLE_SLUG;
	}

	async getStatus(user: User): Promise<SelfHealingStatusDto> {
		const [projectRoles, workflowRoles, personalProject] = await Promise.all([
			this.roles.rolesWithScope('project', REVIEWER_SCOPES),
			this.roles.rolesWithScope('workflow', REVIEWER_SCOPES),
			this.projects.getPersonalProjectForUser(user.id),
		]);
		// The same access rule as the result Inbox, so the status agrees with the list.
		const isReviewer =
			(await this.configurations.canReceiveResults({
				user,
				globalScopes: REVIEWER_SCOPES,
				projectRoles,
				workflowRoles,
			})) || (await this.canReceiveAgentResults(user));
		return { isReviewer, setupProjectId: personalProject?.id ?? null };
	}

	private async canReceiveAgentResults(user: User) {
		const [projectRoleSlugs, globalRoleSlugs] = await Promise.all([
			this.roles.rolesWithScope('project', AGENT_REVIEWER_SCOPES),
			this.roles.rolesWithScope('global', AGENT_REVIEWER_SCOPES),
		]);
		return await this.configurations.canReceiveAgentResults(user.id, {
			projectRoleSlugs,
			globalRoleSlugs,
		});
	}

	/** The Agent context service, or `null` when Agents are off. */
	private async agentContext() {
		// A static import starts the Agents service graph before the agents module starts.
		const { getAgentContextService } = await import('../agents-access.js');
		return getAgentContextService();
	}

	async list(projectId: string) {
		return await this.configurations.list(projectId);
	}

	async get(projectId: string, id: number) {
		const [configuration] = await this.configurations.list(projectId, id);
		if (!configuration) throw new NotFoundError('Self-healing configuration not found.');
		return configuration;
	}

	async getConfigurationChoices(projectId: string): Promise<SelfHealingConfigurationOptions> {
		const agentContext = await this.agentContext();
		const [project, workflows, agents, reviewers] = await Promise.all([
			this.projects.findOneBy({ id: projectId }),
			this.configurations.listProjectWorkflows(projectId),
			agentContext?.listProjectAgents(projectId) ?? [],
			this.findEligibleReviewers(projectId),
		]);
		if (!project) throw new NotFoundError('Project not found.');

		return {
			project: { name: project.name, icon: project.icon },
			workflows: workflows.map(({ id, name }) => ({ id, name })),
			agents: agents.map(({ id, name, published }) => ({ id, name, published })),
			reviewers: reviewers.map(({ id, email, firstName, lastName }) => ({
				id,
				email,
				firstName,
				lastName,
			})),
		};
	}

	async save(
		user: User,
		projectId: string,
		input: SaveSelfHealingConfigurationDto | UpdateSelfHealingConfigurationDto,
		id?: number,
	) {
		await this.validateSelections(projectId, input);
		const agentsAvailable = await this.validateAgentSelections(projectId, input, id === undefined);

		const enabled = 'enabled' in input && input.enabled;
		const coverage = inputCoverage(input);
		// An edit needs the enable check only when it adds agent authority. See below.
		const access = (id === undefined ? enabled : coverage.agents)
			? await this.actorAccess(user, projectId)
			: NO_ACTOR_ACCESS;

		const savedId = await runInTransaction(this.transactionRunner, {}, async (ctx) => {
			let configuration: SelfHealingConfiguration;
			if (id === undefined) {
				configuration = new SelfHealingConfiguration();
				configuration.projectId = projectId;
				configuration.enabled = false;
				configuration.enabledById = null;
				if (enabled) this.enable(configuration, user, access, coverage);
			} else {
				configuration = await this.requireConfiguration(id, projectId, ctx);
				if (!agentsAvailable) await this.rejectAgentSelectionChange(configuration, input, ctx);
				// The enabling user authorizes agent edits, and publication in `auto` mode.
				// The user who adds this authority must have it.
				const addsAgentAuthority =
					coverage.agents &&
					(configuration.agentScope === 'none' ||
						(coverage.auto && configuration.agentPublicationMode !== 'auto'));
				if (configuration.enabled && addsAgentAuthority) {
					this.enable(configuration, user, access, coverage);
				}
			}

			if (
				input.agentScope === 'all' &&
				(await this.configurations.hasAllAgentsConfiguration(projectId, id, ctx))
			) {
				throw new ConflictError('This project already has an all-agents configuration.');
			}

			configuration.scope = input.scope;
			configuration.includeAllProjectMembers = input.includeAllProjectMembers;
			configuration.includeSubWorkflows = input.includeSubWorkflows;
			configuration.agentScope = input.agentScope;
			configuration.agentGoals = normalizeSelfHealingAgentGoals(input.agentGoals);
			configuration.agentScheduleIntervalHours = input.agentScheduleIntervalHours;
			configuration.agentTraceThreshold = input.agentTraceThreshold;
			configuration.agentPublicationMode = input.agentPublicationMode;

			await this.configurations.saveConfiguration(configuration, ctx);
			await this.configurations.replaceSelections(configuration, input, ctx);
			await this.configurations.replaceAgentSelections(configuration, selectedAgentIds(input), ctx);
			await this.requireEligibleReviewers(configuration, ctx);
			afterCommit(ctx, () =>
				this.trackChange(configuration, id === undefined ? 'created' : 'updated', {
					actorId: user.id,
					selections: input,
				}),
			);
			return configuration.id;
		});

		return await this.get(projectId, savedId);
	}

	async setEnabled(user: User, projectId: string, id: number, enabled: boolean) {
		const access = enabled ? await this.actorAccess(user, projectId) : NO_ACTOR_ACCESS;

		const threadIds = await runInTransaction(this.transactionRunner, {}, async (ctx) => {
			const configuration = await this.requireConfiguration(id, projectId, ctx);
			if (enabled) await this.requireEligibleReviewers(configuration, ctx);
			const changed = configuration.enabled !== enabled;
			if (enabled && changed) {
				this.enable(configuration, user, access, await this.coverage(configuration, ctx));
			}
			configuration.enabled = enabled;
			await this.configurations.saveConfiguration(configuration, ctx);
			if (changed) {
				afterCommit(ctx, () =>
					this.trackChange(configuration, enabled ? 'enabled' : 'disabled', {
						actorId: user.id,
					}),
				);
			}
			return enabled ? [] : await this.unfinishedThreadIds(id, ctx);
		});
		await this.cancelInvestigations(threadIds);

		return await this.get(projectId, id);
	}

	private async validateSelections(projectId: string, input: UpdateSelfHealingConfigurationDto) {
		// A configuration can cover agents only.
		if (
			input.scope === 'selected' &&
			input.workflowIds.length === 0 &&
			input.agentScope === 'none'
		) {
			throw new BadRequestError('Select at least one workflow.');
		}
		if (isSelfHealingAgentTriggerMissing(input)) {
			throw new BadRequestError(
				'Set a schedule, a number of sessions, or both for agent investigations.',
			);
		}
		if (input.scope === 'all' && input.workflowIds.length > 0) {
			throw new BadRequestError(
				'An all-workflows configuration cannot include explicit selections.',
			);
		}

		if (input.scope === 'selected') {
			const workflows = await this.configurations.listProjectWorkflows(
				projectId,
				input.workflowIds,
			);
			const projectWorkflowIds = new Set(workflows.map(({ id }) => id));
			if (input.workflowIds.some((id) => !projectWorkflowIds.has(id))) {
				throw new BadRequestError('Select workflows from this project.');
			}
		}

		if (input.reviewerIds.length === 0) {
			if (!input.includeAllProjectMembers) {
				throw new BadRequestError('Select at least one reviewer.');
			}
			// The project group is checked against saved selections in save().
			return;
		}

		const reviewers = await this.findEligibleReviewers(projectId, input.reviewerIds);
		const eligibleReviewerIds = new Set(reviewers.map(({ id }) => id));
		if (input.reviewerIds.some((id) => !eligibleReviewerIds.has(id))) {
			throw new BadRequestError(
				'Select reviewers who are project members with workflow edit access.',
			);
		}
	}

	/**
	 * Check the agent selection against the agents of the project.
	 * Returns false when Agents are off. Then an edit must keep the stored selection.
	 */
	private async validateAgentSelections(
		projectId: string,
		input: UpdateSelfHealingConfigurationDto,
		isNew: boolean,
	) {
		const agentContext = await this.agentContext();
		if (!agentContext) {
			if (isNew && input.agentScope !== 'none') {
				throw new BadRequestError(AGENTS_NOT_AVAILABLE);
			}
			return false;
		}
		if (input.agentScope !== 'selected') return true;

		if (input.agentIds.length === 0) {
			throw new BadRequestError('Select at least one agent.');
		}
		const agents = await agentContext.listProjectAgents(projectId);
		const projectAgentIds = new Set(agents.map(({ id }) => id));
		if (input.agentIds.some((id) => !projectAgentIds.has(id))) {
			throw new BadRequestError('Select agents from this project.');
		}
		return true;
	}

	/** With Agents off, the form sends the stored agent selection back. Accept only that. */
	private async rejectAgentSelectionChange(
		configuration: SelfHealingConfiguration,
		input: AgentSelection,
		ctx: OperationContext,
	) {
		const stored = new Set(await this.configurations.listAgentIds(configuration.id, ctx));
		const sent = selectedAgentIds(input);
		if (
			input.agentScope !== configuration.agentScope ||
			sent.length !== stored.size ||
			sent.some((id) => !stored.has(id))
		) {
			throw new BadRequestError(AGENTS_NOT_AVAILABLE);
		}
	}

	/** The roles that can review each kind. One role read serves all lookups. */
	private async reviewerRoles(
		ctx: OperationContext = {},
	): Promise<{ workflows: ReviewerRoles; agents: ReviewerRoles }> {
		let roles: ReturnType<RoleLoader> | undefined;
		const loadRoles = async () => await (roles ??= this.roleRepository.findAll(ctx));
		const [
			projectRoleSlugs,
			globalRoleSlugs,
			workflowRoleSlugs,
			agentProjectRoleSlugs,
			agentGlobalRoleSlugs,
		] = await Promise.all([
			this.roles.rolesWithScope('project', REVIEWER_SCOPES, loadRoles),
			this.roles.rolesWithScope('global', REVIEWER_SCOPES, loadRoles),
			this.roles.rolesWithScope('workflow', REVIEWER_SCOPES, loadRoles),
			this.roles.rolesWithScope('project', AGENT_REVIEWER_SCOPES, loadRoles),
			this.roles.rolesWithScope('global', AGENT_REVIEWER_SCOPES, loadRoles),
		]);
		return {
			workflows: { projectRoleSlugs, globalRoleSlugs, workflowRoleSlugs },
			// An agent has no shares, so only a project role or a global role gives edit access.
			agents: {
				projectRoleSlugs: agentProjectRoleSlugs,
				globalRoleSlugs: agentGlobalRoleSlugs,
				workflowRoleSlugs: [],
			},
		};
	}

	/** Members who can edit workflows or agents. A reviewer needs edit access to one kind. */
	private async findEligibleReviewers(projectId: string, userIds?: string[]) {
		const roles = await this.reviewerRoles();
		const workflowEditors = await this.configurations.findProjectMembersWithEditAccess(
			projectId,
			roles.workflows,
			userIds,
		);
		const agentEditors = await this.configurations.findProjectMembersWithEditAccess(
			projectId,
			roles.agents,
			userIds,
		);
		const workflowEditorIds = new Set(workflowEditors.map(({ id }) => id));
		return [...workflowEditors, ...agentEditors.filter(({ id }) => !workflowEditorIds.has(id))];
	}

	private async hasWorkflowReviewer(
		configuration: SelfHealingConfiguration,
		roles: ReviewerRoles,
		ctx: OperationContext,
	) {
		if (await this.configurations.hasReviewerWithEditRole(configuration, roles, ctx)) return true;
		return await this.configurations.hasReviewerWithSharedWorkflowAccess(configuration, roles, ctx);
	}

	/** An agents-only configuration is `selected` with no workflow selections. */
	private async coverage(
		configuration: SelfHealingConfiguration,
		ctx: OperationContext,
	): Promise<Coverage> {
		return {
			workflows:
				configuration.scope === 'all' ||
				(await this.configurations.hasWorkflowSelections(configuration.id, ctx)),
			agents: configuration.agentScope !== 'none',
			auto: configuration.agentPublicationMode === 'auto',
		};
	}

	/** Each kind that the configuration covers needs a reviewer who can edit it. Call after selections are saved. */
	private async requireEligibleReviewers(
		configuration: SelfHealingConfiguration,
		ctx: OperationContext,
	) {
		const roles = await this.reviewerRoles(ctx);
		const coverage = await this.coverage(configuration, ctx);
		if (
			coverage.workflows &&
			!(await this.hasWorkflowReviewer(configuration, roles.workflows, ctx))
		) {
			throw new BadRequestError(NO_ELIGIBLE_REVIEWER);
		}
		if (
			coverage.agents &&
			!(await this.configurations.hasReviewerWithEditRole(configuration, roles.agents, ctx))
		) {
			throw new BadRequestError(NO_ELIGIBLE_AGENT_REVIEWER);
		}
	}

	async hasReviewerWhoCanEditAll(
		configuration: Pick<SelfHealingConfiguration, 'id' | 'projectId'>,
		workflowIds: string[],
	) {
		const roles = await this.reviewerRoles();
		return await this.configurations.hasReviewerWhoCanEditAll(
			configuration,
			roles.workflows,
			workflowIds,
			{},
		);
	}

	async canActOn(user: User, workflowId: string) {
		return (await this.workflows.findWorkflowHeadForUser(workflowId, user, ACTOR_SCOPES)) !== null;
	}

	private async actorAccess(user: User, projectId: string): Promise<ActorAccess> {
		const [workflows, agents, agentPublish] = await Promise.all([
			userHasScopes(user, ACTOR_SCOPES, false, { projectId }),
			userHasScopes(user, AGENT_ACTOR_SCOPES, false, { projectId }),
			userHasScopes(user, AGENT_PUBLISH_SCOPES, false, { projectId }),
		]);
		return { workflows, agents, agentPublish };
	}

	/** Enable the configuration and record the user whose access it uses. */
	private enable(
		configuration: SelfHealingConfiguration,
		user: User,
		access: ActorAccess,
		coverage: Coverage,
	) {
		if (coverage.workflows && !access.workflows) {
			throw new ForbiddenError(
				'Workflow edit and execution read access are required to enable self-healing.',
			);
		}
		if (coverage.agents && !access.agents) {
			throw new ForbiddenError(
				'Agent edit and run access are required to enable self-healing for agents.',
			);
		}
		if (coverage.agents && coverage.auto && !access.agentPublish) {
			throw new ForbiddenError('Agent publish access is required for automatic publication.');
		}
		configuration.enabled = true;
		configuration.enabledById = user.id;
	}

	private async unfinishedThreadIds(configurationId: number, ctx: OperationContext) {
		return [
			...(await this.investigations.getUnfinishedThreadIdsForConfiguration(configurationId, ctx)),
			...(await this.agentInvestigations.findUnfinishedThreadIds(configurationId, ctx)),
		];
	}

	async remove(user: User, projectId: string, id: number) {
		const threadIds = await runInTransaction(this.transactionRunner, {}, async (ctx) => {
			const configuration = await this.requireConfiguration(id, projectId, ctx);
			const unfinished = await this.unfinishedThreadIds(id, ctx);
			await this.configurations.deleteConfiguration(id, ctx);
			afterCommit(ctx, () => this.trackChange(configuration, 'deleted', { actorId: user.id }));
			return unfinished;
		});
		await this.cancelInvestigations(threadIds);
	}

	/** Request cancellation only after the configuration transaction commits. */
	private async cancelInvestigations(threadIds: string[]) {
		for (const threadId of threadIds) {
			try {
				// Selection cleanup and saved reviews do not need the Assistant runtime.
				const { InstanceAiService } = await import('../instance-ai.service.js');
				await Container.get(InstanceAiService).routeCancelRun(threadId);
			} catch (error) {
				this.logger.warn('Could not cancel a self-healing investigation.', { threadId, error });
			}
		}
	}

	private async requireConfiguration(id: number, projectId: string, ctx: OperationContext) {
		const configuration = await this.configurations.findForUpdate(id, projectId, ctx);
		if (!configuration) throw new NotFoundError('Self-healing configuration not found.');
		return configuration;
	}

	async recheckAccess(id: number, projectId: string, workflowId: string) {
		await runInTransaction(this.transactionRunner, {}, async (ctx) => {
			const configuration = await this.configurations.findForUpdate(id, projectId, ctx);
			if (configuration) {
				await this.resolveActorOrPause(configuration, workflowId, ctx);
			}
		});
	}

	/** Resolve the actor or pause after access loss. Call under the configuration lock. */
	async resolveActorOrPause(
		configuration: SelfHealingConfiguration,
		workflowId: string,
		ctx: OperationContext,
	) {
		if (!configuration.enabled) return null;

		const roles = await this.reviewerRoles(ctx);
		if (!(await this.hasWorkflowReviewer(configuration, roles.workflows, ctx))) {
			configuration.enabled = false;
			await this.configurations.saveConfiguration(configuration, ctx);
			afterCommit(ctx, () =>
				this.trackChange(configuration, 'auto_paused', { reason: 'no_eligible_reviewer' }),
			);
			return null;
		}

		if (configuration.enabledById) {
			const user = await this.users.findByIdWithRole(configuration.enabledById, ctx);
			if (user && !user.disabled) {
				const workflow = await this.workflows.findWorkflowForUser(workflowId, user, ACTOR_SCOPES, {
					ctx,
				});
				if (workflow) return user;
			}
		}

		// A workflow transfer does not revoke access to the original project.
		const owner = await this.ownership.getWorkflowOwningProject(workflowId, ctx);
		if (owner?.id !== configuration.projectId) return null;

		configuration.enabled = false;
		await this.configurations.saveConfiguration(configuration, ctx);
		afterCommit(ctx, () =>
			this.trackChange(configuration, 'auto_paused', { reason: 'enabling_user_lost_access' }),
		);
		return null;
	}

	/**
	 * Resolve the actor of an agent investigation or pause after access loss.
	 * Call under the configuration lock.
	 */
	async resolveAgentActorOrPause(configuration: SelfHealingConfiguration, ctx: OperationContext) {
		if (!configuration.enabled || configuration.agentScope === 'none') return null;

		const pause = async (reason: 'no_eligible_reviewer' | 'enabling_user_lost_access') => {
			configuration.enabled = false;
			await this.configurations.saveConfiguration(configuration, ctx);
			afterCommit(ctx, () => this.trackChange(configuration, 'auto_paused', { reason }));
			return null;
		};

		const roles = await this.reviewerRoles(ctx);
		if (!(await this.configurations.hasReviewerWithEditRole(configuration, roles.agents, ctx))) {
			return await pause('no_eligible_reviewer');
		}

		// A deleted enabling user leaves `enabledById` empty.
		const user = configuration.enabledById
			? await this.users.findByIdWithRole(configuration.enabledById, ctx)
			: null;
		if (!user || user.disabled) return await pause('enabling_user_lost_access');

		// The scope check takes no operation context. It reads committed project roles.
		const { projectId } = configuration;
		const scopes =
			configuration.agentPublicationMode === 'auto'
				? [...AGENT_ACTOR_SCOPES, ...AGENT_PUBLISH_SCOPES]
				: AGENT_ACTOR_SCOPES;
		if (!(await userHasScopes(user, scopes, false, { projectId }))) {
			return await pause('enabling_user_lost_access');
		}
		return user;
	}
}
