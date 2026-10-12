import { ProjectScopeService } from '@n8n/backend-services';
import { Service } from '@n8n/di';
import { BadRequestError, ForbiddenError } from '@n8n/errors';
import type { Scope } from '@n8n/permissions';
import { UnexpectedError, UserError } from 'n8n-workflow';

import { AgentConfigService } from '@/modules/agents/agent-config.service';
import { AgentConfigPreparationService } from '@/modules/agents/agent-config-preparation.service';
import { AgentPolicyService } from '@/modules/agents/agent-policy.service';
import { AgentsService } from '@/modules/agents/agents.service';
import { AgentsSettingsService } from '@/modules/agents/agents-settings.service';
import type { CompleteAgentDefinition } from '@/modules/agents/utils/agent-definition';
import type { Agent } from '@/modules/agents/entities/agent.entity';

import { agentBodyIssues } from './agent-body-issues';
import { AgentImportMatchService } from './agent-import-match.service';
import {
	requiredAgentScopes,
	type AgentImportMatchContext,
	type ResolvedAgentImportIdentity,
	type AgentImportPlan,
	type AgentPlanItem,
	type PreparedAgent,
	type PersistedAgentOutcome,
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
		private readonly configService: AgentConfigService,
		private readonly configPreparation: AgentConfigPreparationService,
		private readonly policyService: AgentPolicyService,
		private readonly projectScopeService: ProjectScopeService,
		private readonly settingsService: AgentsSettingsService,
	) {}

	async apply(
		context: AgentImportMatchContext,
		plan: AgentImportPlan,
	): Promise<PersistedAgentOutcome[]> {
		const outcomes: PersistedAgentOutcome[] = [];
		// The project has been created. Pending-project planning grants no apply-time exception.
		await this.assertScopes(
			{ ...context, projectPendingCreation: false },
			requiredAgentScopes(plan),
		);
		for (const item of plan.items) {
			if (item.action === 'skip' && item.existing) {
				outcomes.push({
					status: 'skipped',
					agent: item.existing,
					sourceAgentId: item.sourceAgentId,
				});
				continue;
			}
			const definition = completeDefinition(item);
			const options = {
				metadata: {
					sourceAgentId: item.sourceAgentId,
					sourceTaskIds: new Map([...item.taskIds].map(([source, target]) => [target, source])),
					availableInMCP: item.availableInMCP,
				},
				plannedDestinations: plan.plannedDestinations,
			};
			let agent: Agent;
			if (item.action === 'create') {
				agent = await this.agentsService.create(context.projectId, item.name, {
					...options,
					id: item.targetAgentId,
					definition,
					user: context.user,
					actor: { kind: 'user', user: context.user },
				});
			} else if (item.existing) {
				agent = await this.configService.replaceDefinition(
					item.targetAgentId,
					context.projectId,
					definition,
					context.user,
					{
						...options,
						expectedRevision: item.existing.revision,
					},
				);
			} else {
				throw new UnexpectedError('An existing Agent is required for the planned action.');
			}
			outcomes.push({
				status: item.action === 'create' ? 'created' : 'updated',
				agent,
				sourceAgentId: item.sourceAgentId,
				item,
			});
		}
		return outcomes;
	}

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
		for (const [id, tool] of Object.entries(item.tools)) {
			if (id !== tool.descriptor.name)
				throw new UserError(`Custom tool "${id}" must use its descriptor name as its ID.`);
		}
		const definition = await this.configPreparation.validateDefinition(
			item.targetAgentId,
			completeDefinition(item),
		);
		item.config = definition.config;
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

function completeDefinition(item: PreparedAgent): CompleteAgentDefinition {
	return {
		name: item.name,
		config: item.config,
		skills: item.skills,
		tools: item.tools,
		tasks: new Map(Object.entries(item.tasks)),
	};
}
