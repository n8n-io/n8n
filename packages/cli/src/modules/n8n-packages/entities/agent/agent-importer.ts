import { ProjectScopeService } from '@n8n/backend-services';
import { Service } from '@n8n/di';
import { BadRequestError, ForbiddenError } from '@n8n/errors';
import type { Scope } from '@n8n/permissions';
import { UserError } from 'n8n-workflow';

import { AgentConfigPreparationService } from '@/modules/agents/agent-config-preparation.service';
import { AgentCustomToolsService } from '@/modules/agents/agent-custom-tools.service';
import { AgentPolicyService } from '@/modules/agents/agent-policy.service';
import { AgentSkillsService } from '@/modules/agents/agent-skills.service';
import { AgentTaskService } from '@/modules/agents/agent-task.service';
import { AgentsService } from '@/modules/agents/agents.service';
import { AgentsSettingsService } from '@/modules/agents/agents-settings.service';

import { agentBodyIssues } from './agent-body-issues';
import { AgentImportMatchService } from './agent-import-match.service';
import {
	requiredAgentScopes,
	type AgentImportMatchContext,
	type ResolvedAgentImportIdentity,
	type AgentImportPlan,
	type AgentPlanItem,
	type PreparedAgent,
} from './agent-import.types';
import type { ImportWorkflowProperties } from '../../n8n-packages.types';
import { decideImportConflictAction } from '../import-conflict-policy';
import { derivePublishedState } from '../workflow/workflow-published-state';
import { decidePublishingAction } from '../workflow/workflow-publishing-policy';

@Service()
export class AgentImporter {
	constructor(
		private readonly matcher: AgentImportMatchService,
		private readonly agentsService: AgentsService,
		private readonly configService: AgentConfigPreparationService,
		private readonly skillsService: AgentSkillsService,
		private readonly toolsService: AgentCustomToolsService,
		private readonly taskService: AgentTaskService,
		private readonly policyService: AgentPolicyService,
		private readonly projectScopeService: ProjectScopeService,
		private readonly settingsService: AgentsSettingsService,
	) {}

	async plan(
		context: AgentImportMatchContext,
		agents: PreparedAgent[],
		options: ImportWorkflowProperties,
	): Promise<AgentImportPlan> {
		const plan: AgentImportPlan = {
			items: [],
			issues: [],
		};
		if (agents.length === 0) return plan;
		const matches = await this.matcher.findBySourceAgentIds(
			context,
			agents.map((a) => a.sourceAgentId),
		);
		const identities = await this.matcher.allocateAgentIds(matches);
		for (const conflict of identities.idConflicts) {
			plan.issues.push({
				type: 'agent-conflict',
				kind: 'id',
				sourceAgentId: conflict.sourceAgentId,
				projectId: context.projectId,
				targetIds: [conflict.existingAgentId],
			});
		}
		for (const agent of agents) {
			const identity = identities.identities.get(agent.sourceAgentId);
			if (identity) await this.planDefinition(agent, identity, context, options, plan);
		}
		await this.assertScopes(context, requiredAgentScopes(plan));
		const active = plan.items.filter(({ action }) => action !== 'skip');
		if (active.length > 0) await this.settingsService.assertEnabled();
		for (const item of active) plan.issues.push(...agentBodyIssues(item));
		return plan;
	}

	private async planDefinition(
		agent: PreparedAgent,
		identity: ResolvedAgentImportIdentity,
		context: AgentImportMatchContext,
		options: ImportWorkflowProperties,
		plan: AgentImportPlan,
	): Promise<void> {
		const { action, blocked } = decideImportConflictAction(
			options.workflowConflictPolicy,
			identity.existing !== null,
		);
		if (blocked) {
			plan.issues.push({
				type: 'agent-conflict',
				kind: 'existing',
				sourceAgentId: agent.sourceAgentId,
				projectId: context.projectId,
				targetIds: [identity.targetAgentId],
			});
			return;
		}
		const existing = identity.existing
			? await this.agentsService.findById(identity.targetAgentId, context.projectId)
			: null;
		if (identity.existing && !existing) {
			plan.issues.push({
				type: 'agent-invalid',
				sourceAgentId: agent.sourceAgentId,
				path: 'id',
				message: 'The destination Agent no longer exists.',
			});
			return;
		}
		const statuses = { create: 'created', update: 'updated', skip: 'skipped' } as const;
		const publishingAction = decidePublishingAction(options.workflowPublishingPolicy, {
			status: statuses[action],
			currentlyPublished: Boolean(existing?.activeVersionId),
			sourcePublished: derivePublishedState(agent.metadata),
		});
		plan.items.push({
			...structuredClone(agent),
			action,
			targetAgentId: identity.targetAgentId,
			existing,
			publishingAction,
		});
	}

	async validate(
		plan: AgentImportPlan,
		context: AgentImportMatchContext,
		createsCredentialStubs: boolean,
	): Promise<void> {
		if (createsCredentialStubs) await this.assertScopes(context, ['credential:create']);
		const { projectId } = context;
		for (const item of plan.items) {
			if (item.action === 'skip') continue;
			try {
				await this.validateDefinition(item);
			} catch (error) {
				if (!(error instanceof UserError) && !(error instanceof BadRequestError)) throw error;
				plan.issues.push({
					type: 'agent-invalid',
					sourceAgentId: item.sourceAgentId,
					path: 'config',
					message: error.message,
				});
				continue;
			}
			const content = item.config ?? { name: item.name };
			const { violations } = await this.policyService.evaluateSave(
				projectId,
				item.existing?.id ?? null,
				content,
				item.existing?.schema ?? null,
			);
			if (violations.length > 0) {
				plan.issues.push({
					type: 'agent-policy-violation',
					sourceAgentId: item.sourceAgentId,
					name: item.name,
					violations,
				});
			}
		}
	}

	private async validateDefinition(item: AgentPlanItem): Promise<void> {
		this.skillsService.validateSkills(Object.values(item.skills));
		for (const [id, tool] of Object.entries(item.tools)) {
			this.toolsService.validateDescriptor(tool.descriptor);
			if (id !== tool.descriptor.name)
				throw new UserError(`Custom tool "${id}" must use its descriptor name as its ID.`);
		}
		this.taskService.validateTasks(Object.values(item.tasks));
		if (Object.keys(item.tasks).length > 0)
			this.taskService.assertAgentHasConfig(item.config !== null);
		if (!item.config) return;
		this.configService.validateSubAgentRefs(
			item.config.subAgents?.agents ?? [],
			item.targetAgentId,
		);
		const validation = await this.configService.validateConfig(item.config);
		if (!validation.valid) throw new UserError(validation.error);
		item.config = validation.config;
	}

	private async assertScopes(context: AgentImportMatchContext, scopes: Scope[]): Promise<void> {
		if (context.projectPendingCreation) return;
		const projectIds = await this.projectScopeService.getProjectIds(context.user, scopes);
		if (projectIds !== null && !projectIds.includes(context.projectId)) {
			throw new ForbiddenError(
				'You do not have permission to perform the planned Agent import actions in the destination project.',
			);
		}
	}
}
