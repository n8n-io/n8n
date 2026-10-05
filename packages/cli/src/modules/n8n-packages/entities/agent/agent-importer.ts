import { ModuleRegistry } from '@n8n/backend-common';
import { Container, Service } from '@n8n/di';
import { ForbiddenError } from '@n8n/errors';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { UserError } from 'n8n-workflow';

import type { AgentConfigService } from '@/modules/agents/agent-config.service';
import type { AgentPublishService } from '@/modules/agents/agent-publish.service';
import type { AgentsService } from '@/modules/agents/agents.service';
import type { Agent } from '@/modules/agents/entities/agent.entity';
import { NodeTypes } from '@/node-types';
import { ProjectService } from '@/services/project.service.ee';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import {
	agentTaskBindings,
	agentWorkflowIds,
	applyAgentBindings,
	collectPlannedAgentBindings,
} from './agent-import-references';
import type {
	AgentImportPlan,
	AgentPlanItem,
	PersistedAgentOutcome,
	PreparedAgent,
} from './agent-import.types';
import type { ImportPlan, ImportContentResult } from '../../engine/import-orchestrator';
import type {
	BlockingIssue,
	ImportAgentProperties,
	ImportContext,
	ImportedAgentSummary,
	ImportWorkflowProperties,
	WorkflowPublishingPolicy,
} from '../../n8n-packages.types';
import { collectNodeTypeUsage } from '../workflow/node-type-usage';
import { decideWorkflowConflictAction } from '../workflow/workflow-conflict-policy';
import { decideWorkflowId } from '../workflow/workflow-id-policy';
import { collectPlannedWorkflowBindings } from '../workflow/workflow-importer';
import { decideWorkflowPublishingAction } from '../workflow/workflow-publishing-policy';
import { orderBySubWorkflowDependencies } from '../workflow/sub-workflow-ordering';

interface AgentServices {
	agents: AgentsService;
	config: AgentConfigService;
	publish: AgentPublishService;
}

interface AgentImportScope {
	plan: ImportPlan;
	content: ImportContentResult;
}

@Service()
export class AgentImporter {
	constructor(
		private readonly modules: ModuleRegistry,
		private readonly projects: ProjectService,
		private readonly workflowFinder: WorkflowFinderService,
		private readonly nodeTypes: NodeTypes,
	) {}

	private async getServices(): Promise<AgentServices> {
		if (!this.modules.isActive('agents')) {
			throw new UserError('The agents module is disabled. Agent import is not available.');
		}
		const { AgentsService } = await import('@/modules/agents/agents.service.js');
		const { AgentConfigService } = await import('@/modules/agents/agent-config.service.js');
		const { AgentPublishService } = await import('@/modules/agents/agent-publish.service.js');
		const { AgentsSettingsService } = await import('@/modules/agents/agents-settings.service.js');
		await Container.get(AgentsSettingsService).assertEnabled();
		return {
			agents: Container.get(AgentsService),
			config: Container.get(AgentConfigService),
			publish: Container.get(AgentPublishService),
		};
	}

	async plan(
		context: ImportContext,
		prepared: PreparedAgent[],
		options: ImportAgentProperties & ImportWorkflowProperties,
		pendingProject = false,
	): Promise<AgentImportPlan> {
		const plan: AgentImportPlan = { context, items: [], blockingIssues: [], missingNodeTypes: [] };
		if (prepared.length === 0) return plan;
		const services = await this.getServices();
		if (!pendingProject) await this.assertCanImport(context, options);
		const candidates = await services.agents.findImportCandidates(
			context.projectId,
			prepared.map(({ sourceAgentId }) => sourceAgentId),
		);
		for (const agent of prepared) {
			const item = planAgent(agent, candidates, options, plan.blockingIssues);
			plan.items.push(item);
			if (item.action !== 'skip')
				await this.validateDefinition(item, options, plan, services.config);
		}
		await this.checkIds(plan, services.agents);
		return plan;
	}

	private async assertCanImport(context: ImportContext, options: ImportAgentProperties) {
		if (
			!(await this.projects.getProjectWithScope(context.user, context.projectId, ['agent:import']))
		) {
			throw new ForbiddenError('You do not have permission to import agents into this project.');
		}
		if (options.agentPublishingPolicy === 'publish-all')
			await this.assertCanPublish(context, 'publish');
	}

	private async checkIds(plan: AgentImportPlan, agents: AgentsService) {
		const creating = plan.items.filter((item) => item.action === 'create');
		const occupied = await agents.findExistingIds(creating.map(({ targetId }) => targetId));
		for (const item of creating) {
			if (!occupied.has(item.targetId)) continue;
			plan.blockingIssues.push({
				type: 'agent-id-conflict',
				sourceAgentId: item.sourceAgentId,
				existingAgentIds: [item.targetId],
			});
		}
		const writing = plan.items.filter((item) => item.action !== 'skip');
		const taskOwners = await agents.findTaskOwners(
			writing.flatMap((item) => [...item.taskBindings.values()]),
		);
		plan.blockingIssues.push(...taskIdConflicts(writing, taskOwners));
	}

	private async validateDefinition(
		item: AgentPlanItem,
		options: ImportWorkflowProperties,
		plan: AgentImportPlan,
		configService: AgentConfigService,
	) {
		const config = item.definition.config;
		if (!config) return;
		const nodes = (config.tools ?? [])
			.filter((tool) => tool.type === 'node')
			.map(({ node }) => ({ type: node.nodeType, typeVersion: node.nodeTypeVersion }));
		const missing = collectNodeTypeUsage([
			{ agentId: item.sourceAgentId, projectId: plan.context.projectId, nodes },
		]).filter(
			({ type, typeVersion }) => !this.nodeTypes.getSupportedVersions(type)?.includes(typeVersion),
		);
		plan.missingNodeTypes.push(...missing);
		if (options.missingNodeTypeMode === 'fail') {
			plan.blockingIssues.push(
				...missing.map(
					({ type, typeVersion, usedByAgents }): BlockingIssue => ({
						type: 'missing-node-type',
						nodeType: type,
						typeVersion,
						usedByWorkflows: [],
						usedByAgents,
					}),
				),
			);
		}
		// Missing node types follow the package policy. The domain service validates the other tools.
		const result = await configService.validateConfig({
			...config,
			tools: config.tools?.filter(
				(tool) =>
					tool.type !== 'node' ||
					!missing.some(
						(node) =>
							node.type === tool.node.nodeType && node.typeVersion === tool.node.nodeTypeVersion,
					),
			),
		});
		if (!result.valid)
			throw new UserError(`Invalid package agent "${item.sourceAgentId}": ${result.error}`);
		if (config.subAgents?.agents?.some((ref) => ref.agentId === item.sourceAgentId)) {
			throw new UserError('An agent cannot use itself as a subagent.');
		}
	}

	async dependencyFailures(plans: ImportPlan[]): Promise<BlockingIssue[]> {
		const agentPlans = plans.flatMap((plan) => (plan.agentPlan ? [plan.agentPlan] : []));
		if (!agentPlans.some(({ items }) => items.length)) return [];
		const { agents } = await this.getServices();
		const workflowIds = new Set(
			plans.flatMap((plan) => [...collectPlannedWorkflowBindings(plan.workflowPlan.items).keys()]),
		);
		const issues: BlockingIssue[] = [];
		const taskOwners = new Map<string, string>();
		for (const plan of agentPlans) {
			const writing = plan.items.filter((item) => item.action !== 'skip');
			const sameProjectPlans = agentPlans.filter(
				({ context }) => context.projectId === plan.context.projectId,
			);
			const plannedAgentIds = new Set(collectPlannedAgentBindings(sameProjectPlans).keys());
			const available = await this.availableDependencies(
				plan,
				writing,
				agents,
				plannedAgentIds,
				workflowIds,
			);
			issues.push(...dependencyIssues(writing, available.agents, available.workflows));
			issues.push(...taskIdConflicts(writing, taskOwners));
			for (const item of writing) {
				for (const id of item.taskBindings.values()) taskOwners.set(id, item.targetId);
			}
		}
		return issues;
	}

	private async availableDependencies(
		plan: AgentImportPlan,
		items: AgentPlanItem[],
		agents: AgentsService,
		plannedAgentIds: Set<string>,
		plannedWorkflowIds: Set<string>,
	) {
		const agentIds = items.flatMap((item) =>
			(item.definition.config?.subAgents?.agents ?? []).map(({ agentId }) => agentId),
		);
		const workflowIds = items.flatMap((item) => agentWorkflowIds(item.definition.config));
		const externalAgents = await agents.findByIdsForUser(
			agentIds.filter((id) => !plannedAgentIds.has(id)),
			plan.context.user,
			['agent:read'],
		);
		const externalWorkflows = await this.workflowFinder.findWorkflowIdsWithScopeForUser(
			workflowIds.filter((id) => !plannedWorkflowIds.has(id)),
			plan.context.user,
			['workflow:read'],
		);
		return {
			agents: new Set([
				...plannedAgentIds,
				...externalAgents
					.filter((agent) => agent.projectId === plan.context.projectId)
					.map(({ id }) => id),
			]),
			workflows: new Set([...plannedWorkflowIds, ...externalWorkflows]),
		};
	}

	async applyToPackage(
		scopes: AgentImportScope[],
		policy: WorkflowPublishingPolicy = 'preserve-published-state',
	): Promise<ImportedAgentSummary[]> {
		const agentPlans = scopes.flatMap(({ plan }) => (plan.agentPlan ? [plan.agentPlan] : []));
		if (!agentPlans.some(({ items }) => items.length)) return [];
		const services = await this.getServices();
		const agentBindings = collectPlannedAgentBindings(agentPlans);
		const workflowBindings = new Map(
			scopes.flatMap(({ content }) => [...content.bindings.workflows]),
		);
		await this.createShells(agentPlans, services.agents);
		const outcomes: PersistedAgentOutcome[] = [];
		for (const { plan, content } of scopes) {
			content.bindings.agents = agentBindings;
			for (const item of plan.agentPlan?.items ?? []) {
				const agent =
					item.action === 'skip'
						? item.existing!
						: await services.config.replaceDefinition(
								item.targetId,
								plan.input.context.projectId,
								applyAgentBindings(item, {
									...content.bindings,
									workflows: workflowBindings,
									agents: agentBindings,
								}),
								plan.input.context.user,
							);
				const summary = agentSummary(item, agent);
				outcomes.push({ item, agent, summary });
				content.agentSummaries.push(summary);
			}
		}
		const requirements = outcomes.flatMap(({ item }) =>
			(item.definition.config?.subAgents?.agents ?? []).map(({ agentId }) => ({
				id: agentId,
				usedByWorkflows: [item.sourceAgentId],
			})),
		);
		const ordered = orderBySubWorkflowDependencies(
			outcomes.map((outcome) => ({ ...outcome, sourceWorkflowId: outcome.item.sourceAgentId })),
			requirements,
		);
		const scopesByProject = new Map(
			scopes.map((scope) => [scope.plan.input.context.projectId, scope]),
		);
		for (const outcome of ordered) {
			await this.publish(
				outcome,
				scopesByProject.get(outcome.agent.projectId)!,
				policy,
				services.publish,
			);
		}
		return outcomes.map(({ summary }) => summary);
	}

	private async createShells(plans: AgentImportPlan[], agents: AgentsService) {
		// Create every shell before writing definitions so cyclic references resolve.
		for (const plan of plans) {
			for (const item of plan.items.filter(({ action }) => action === 'create')) {
				await agents.create(plan.context.projectId, item.definition.name, {
					id: item.targetId,
					sourceAgentId: item.sourceAgentId,
				});
			}
		}
	}

	private async publish(
		outcome: PersistedAgentOutcome,
		scope: AgentImportScope,
		policy: WorkflowPublishingPolicy,
		publisher: AgentPublishService,
	) {
		const { item, agent, summary } = outcome;
		const action = decideWorkflowPublishingAction(policy, {
			status: summary.status,
			currentlyPublished: !!agent.activeVersionId,
			sourcePublished: item.sourcePublished,
			isArchived: false,
		});
		if (action === 'noop') return;
		const blockedReason = publishBlockedReason(item.sourceAgentId, scope);
		if (action === 'publish' && blockedReason) {
			summary.publishing = agent.activeVersionId
				? { state: 'unchanged', skippedPublishReason: blockedReason }
				: { state: 'blocked', blockedReason };
			return;
		}
		try {
			const { user } = scope.plan.input.context;
			await this.assertCanPublish(scope.plan.input.context, action);
			let current: Agent;
			if (action === 'publish') {
				current = (
					await publisher.publishAgent(agent.id, agent.projectId, user, {
						by: 'user',
						trigger: 'explicit',
					})
				).agent;
			} else {
				current = await publisher.unpublishAgent(agent.id, agent.projectId, user, 'user');
			}
			summary.activeVersionId = current.activeVersionId;
			summary.publishing = { state: action === 'publish' ? 'published' : 'unpublished' };
		} catch (error) {
			summary.publishing = { state: 'failed', error: ensureError(error).message };
		}
	}

	private async assertCanPublish(context: ImportContext, action: 'publish' | 'unpublish') {
		if (
			!(await this.projects.getProjectWithScope(context.user, context.projectId, [
				`agent:${action}`,
			]))
		) {
			throw new ForbiddenError(`You do not have permission to ${action} agents in this project.`);
		}
	}
}

function planAgent(
	agent: PreparedAgent,
	candidates: Agent[],
	options: ImportAgentProperties,
	issues: BlockingIssue[],
): AgentPlanItem {
	const lineage = candidates.filter((candidate) => candidate.sourceAgentId === agent.sourceAgentId);
	const existing =
		lineage[0] ??
		candidates.find(
			(candidate) => candidate.id === agent.sourceAgentId && candidate.sourceAgentId === null,
		) ??
		null;
	const decision = decideWorkflowConflictAction(
		options.agentConflictPolicy ?? 'new-version',
		existing,
	);
	if (lineage.length > 1) {
		issues.push({
			type: 'agent-lineage-conflict',
			sourceAgentId: agent.sourceAgentId,
			existingAgentIds: lineage.map(({ id }) => id),
		});
	} else if (decision.blocked && existing) {
		issues.push({
			type: 'agent-conflict',
			sourceAgentId: agent.sourceAgentId,
			existingAgentIds: [existing.id],
		});
	}
	const targetId =
		existing?.id ?? decideWorkflowId(options.agentIdPolicy ?? 'source', agent.sourceAgentId);
	return {
		...agent,
		action: decision.action,
		existing,
		targetId,
		taskBindings: agentTaskBindings(agent, targetId),
	};
}

function taskIdConflicts(items: AgentPlanItem[], owners: Map<string, string>): BlockingIssue[] {
	const issues: BlockingIssue[] = [];
	const plannedOwners = new Map(owners);
	for (const item of items) {
		for (const [taskId, targetId] of item.taskBindings) {
			const owner = plannedOwners.get(targetId);
			if (owner && owner !== item.targetId)
				issues.push({ type: 'agent-task-id-conflict', sourceAgentId: item.sourceAgentId, taskId });
			plannedOwners.set(targetId, item.targetId);
		}
	}
	return issues;
}

function dependencyIssues(
	items: AgentPlanItem[],
	agents: Set<string>,
	workflows: Set<string>,
): BlockingIssue[] {
	return items.flatMap((item) => {
		const missingAgents = (item.definition.config?.subAgents?.agents ?? [])
			.map(({ agentId }) => agentId)
			.filter((id) => !agents.has(id));
		const missingWorkflows = agentWorkflowIds(item.definition.config).filter(
			(id) => !workflows.has(id),
		);
		return [
			...missingAgents.map(
				(dependencyId): BlockingIssue => ({
					type: 'agent-dependency-unresolved',
					sourceAgentId: item.sourceAgentId,
					dependencyKind: 'agent',
					dependencyId,
				}),
			),
			...missingWorkflows.map(
				(dependencyId): BlockingIssue => ({
					type: 'agent-dependency-unresolved',
					sourceAgentId: item.sourceAgentId,
					dependencyKind: 'workflow',
					dependencyId,
				}),
			),
		];
	});
}

function publishBlockedReason(agentId: string, { plan, content }: AgentImportScope) {
	if (
		plan.agentPlan?.missingNodeTypes.some((requirement) =>
			requirement.usedByAgents?.includes(agentId),
		)
	)
		return 'missing-node-type';
	const stubbed = new Set(content.credentialResult.stubbed);
	if (
		plan.input.credentialRequest.requirements?.some(
			(requirement) => stubbed.has(requirement.id) && requirement.usedByAgents?.includes(agentId),
		)
	)
		return 'stub-credential';
	return undefined;
}

function agentSummary(item: AgentPlanItem, agent: Agent): ImportedAgentSummary {
	let status: ImportedAgentSummary['status'] = 'skipped';
	if (item.action === 'create') status = 'created';
	if (item.action === 'update') status = 'updated';
	return {
		sourceAgentId: item.sourceAgentId,
		localId: agent.id,
		name: agent.name,
		projectId: agent.projectId,
		activeVersionId: agent.activeVersionId,
		status,
		publishing: { state: 'unchanged' },
	};
}
