import { ProjectScopeService } from '@n8n/backend-services';
import { Service } from '@n8n/di';
import { getStaticSubworkflowId, setStaticSubworkflowId } from 'n8n-workflow';

import type { PlannedAgentDestinations } from '@/modules/agents/utils/agent-definition';
import { extractAgentWorkflowRefs } from '@/modules/agents/utils/extract-agent-workflow-refs';
import { visitAgentCredentialReferences } from '@/modules/agents/utils/visit-agent-credential-references';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { AgentImportMatchService } from './agent-import-match.service';
import type {
	AgentImportIssue,
	AgentImportMatchContext,
	AgentPlanItem,
} from './agent-import.types';
import type { ImportPlan } from '../../engine/import-orchestrator';
import type { PackageWorkflowRequirement } from '../../spec/requirements.schema';
import { WorkflowImportMatchService } from '../workflow/workflow-import-match.service';

interface PlannedTarget {
	id: string;
	projectId: string;
	creating: boolean;
	projectPendingCreation: boolean;
}

interface EntityReference {
	kind: 'agent' | 'workflow';
	id: string;
	path: string;
	projectLocal: boolean;
	setId?: (id: string) => void;
}

type DependencyIssue = Extract<AgentImportIssue, { type: 'agent-dependency-unresolved' }>;
type DependencyTarget = { id: string; inProject: boolean } | { reason: DependencyIssue['reason'] };

@Service()
export class AgentImportBindings {
	constructor(
		private readonly agentMatcher: AgentImportMatchService,
		private readonly workflowMatcher: WorkflowImportMatchService,
		private readonly workflowFinder: WorkflowFinderService,
		private readonly projectScopeService: ProjectScopeService,
	) {}

	async resolve(plans: ImportPlan[]): Promise<void> {
		const agents = new Map<string, PlannedTarget>();
		const workflows = new Map<string, PlannedTarget>();
		for (const plan of plans) {
			const target = {
				projectId: plan.input.context.projectId,
				projectPendingCreation: plan.input.projectPendingCreation ?? false,
			};
			for (const item of plan.agentPlan?.items ?? []) {
				agents.set(item.sourceAgentId, {
					...target,
					id: item.targetAgentId,
					creating: item.action === 'create',
				});
			}
			for (const item of plan.workflowPlan.items) {
				workflows.set(item.sourceWorkflowId, {
					...target,
					id: item.action === 'create' ? item.decidedId : item.existing.id,
					creating: item.action === 'create',
				});
			}
		}
		const plannedDestinations: PlannedAgentDestinations = {
			agents: new Map(
				[...agents.values()]
					.filter((target) => target.creating)
					.map((target) => [target.id, target.projectId]),
			),
			workflows: new Map(
				[...workflows.values()]
					.filter((target) => target.creating)
					.map((target) => [target.id, target.projectId]),
			),
		};
		for (const plan of plans) await this.resolveScope(plan, agents, workflows, plannedDestinations);
		await this.checkTaskOwners(plans);
	}

	private async resolveScope(
		plan: ImportPlan,
		agents: Map<string, PlannedTarget>,
		workflows: Map<string, PlannedTarget>,
		plannedDestinations: PlannedAgentDestinations,
	): Promise<void> {
		const { agentPlan } = plan;
		if (!agentPlan) return;
		agentPlan.plannedDestinations = plannedDestinations;
		const items = agentPlan.items.filter(({ action }) => action !== 'skip');
		if (items.length === 0) return;
		const context = {
			...plan.input.context,
			projectPendingCreation: plan.input.projectPendingCreation,
		};
		const references = new Map(items.map((item) => [item, collectReferences(item, plan)]));
		const all = [...references.values()].flat();
		const idsFor = (kind: EntityReference['kind']) => [
			...new Set(all.filter((ref) => ref.kind === kind && ref.id).map(({ id }) => id)),
		];
		const agentTargets = await this.resolveAgents(context, idsFor('agent'), agents);
		const workflowTargets = await this.resolveWorkflows(context, idsFor('workflow'), workflows);
		const credentialBindings = new Map([
			...plan.credentialPlan.successes,
			...plan.credentialPlan.stubIds,
		]);
		for (const [item, refs] of references) {
			bindReferences(
				item,
				refs,
				{ agent: agentTargets, workflow: workflowTargets },
				agentPlan.issues,
				context.projectId,
			);
			bindCredentials(item, credentialBindings, agentPlan.issues, context.projectId);
		}
	}

	private async resolveAgents(
		context: AgentImportMatchContext,
		ids: string[],
		planned: Map<string, PlannedTarget>,
	): Promise<Map<string, DependencyTarget>> {
		const external = await this.agentMatcher.findBySourceAgentIds(
			context,
			ids.filter((id) => !planned.has(id)),
		);
		const resolved = new Map<string, DependencyTarget>();
		for (const id of ids) {
			const target = planned.get(id) ?? external.matches.get(id);
			resolved.set(
				id,
				target
					? { id: target.id, inProject: target.projectId === context.projectId }
					: { reason: 'missing' },
			);
		}
		return resolved;
	}

	private async resolveWorkflows(
		context: AgentImportMatchContext,
		ids: string[],
		planned: Map<string, PlannedTarget>,
	): Promise<Map<string, DependencyTarget>> {
		const resolved = new Map<string, DependencyTarget>();
		if (ids.length === 0) return resolved;
		const externalIds = ids.filter((id) => !planned.has(id));
		const external = await this.workflowMatcher.findBySourceWorkflowIds(
			context.projectId,
			externalIds,
		);
		const targets = new Map(external.matches);
		// Include exact IDs for workflows shared into the project and readable node-tool dependencies.
		const direct = await this.workflowFinder.findWorkflowsByIdsForUser(externalIds, context.user, [
			'workflow:read',
		]);
		for (const workflow of direct) {
			if (!targets.has(workflow.id)) {
				targets.set(workflow.id, workflow);
			}
		}
		const existingIds = ids.flatMap((id) => {
			const target = planned.get(id);
			if (target) return target.creating ? [] : [target.id];
			const existing = targets.get(id);
			return existing ? [existing.id] : [];
		});
		const [readable, inProject, readableProjects] = await Promise.all([
			this.workflowFinder.findWorkflowIdsWithScopeForUser(existingIds, context.user, [
				'workflow:read',
			]),
			this.workflowFinder.findWorkflowIdsWithScopeForUser(
				existingIds,
				context.user,
				['workflow:read'],
				context.projectId,
			),
			this.projectScopeService.getProjectIds(context.user, ['workflow:read']),
		]);
		const ambiguous = new Set(
			external.lineageConflicts.map(({ sourceWorkflowId }) => sourceWorkflowId),
		);
		for (const id of ids) {
			if (ambiguous.has(id)) {
				resolved.set(id, { reason: 'ambiguous' });
				continue;
			}
			const target = planned.get(id);
			if (target?.creating) {
				const allowed =
					target.projectPendingCreation ||
					readableProjects === null ||
					readableProjects.includes(target.projectId);
				resolved.set(
					id,
					allowed
						? { id: target.id, inProject: target.projectId === context.projectId }
						: { reason: 'inaccessible' },
				);
				continue;
			}
			const targetId = target?.id ?? targets.get(id)?.id;
			if (!targetId) resolved.set(id, { reason: 'missing' });
			else if (!readable.has(targetId)) resolved.set(id, { reason: 'inaccessible' });
			else resolved.set(id, { id: targetId, inProject: inProject.has(targetId) });
		}
		return resolved;
	}

	private async checkTaskOwners(plans: ImportPlan[]): Promise<void> {
		const items = plans.flatMap(
			({ agentPlan }) => agentPlan?.items.filter(({ action }) => action !== 'skip') ?? [],
		);
		const conflicts = await this.agentMatcher.findTaskIdConflicts(items);
		for (const plan of plans) {
			const { agentPlan } = plan;
			if (!agentPlan) continue;
			const sourceAgentIds = new Set(agentPlan.items.map(({ sourceAgentId }) => sourceAgentId));
			agentPlan.issues.push(
				...conflicts
					.filter(({ sourceAgentId }) => sourceAgentIds.has(sourceAgentId))
					.map(
						(conflict): AgentImportIssue => ({
							type: 'agent-conflict',
							kind: 'task-id',
							sourceAgentId: conflict.sourceAgentId,
							projectId: plan.input.context.projectId,
							sourceTaskId: conflict.sourceTaskId,
							targetIds: [conflict.conflictingAgentId],
						}),
					),
			);
		}
	}
}

function bindReferences(
	item: AgentPlanItem,
	refs: EntityReference[],
	targets: Record<EntityReference['kind'], Map<string, DependencyTarget>>,
	issues: AgentImportIssue[],
	projectId: string,
): void {
	for (const ref of refs) {
		let target: DependencyTarget = ref.id
			? (targets[ref.kind].get(ref.id) ?? { reason: 'missing' })
			: { reason: 'unsupported' };
		if (!('reason' in target) && ref.projectLocal && !target.inProject)
			target = { reason: 'inaccessible' };
		if ('reason' in target) {
			issues.push({
				type: 'agent-dependency-unresolved',
				sourceAgentId: item.sourceAgentId,
				projectId,
				dependencyType: ref.kind,
				referenceId: ref.id,
				path: ref.path,
				reason: target.reason,
			});
			continue;
		}
		ref.setId?.(target.id);
	}
}

function bindCredentials(
	item: AgentPlanItem,
	bindings: Map<string, string>,
	issues: AgentImportIssue[],
	projectId: string,
): void {
	visitAgentCredentialReferences(item.config, ({ id, path, managedToken, setId }) => {
		if (!id || id === managedToken) return;
		const targetId = bindings.get(id);
		if (targetId) setId(targetId);
		else
			issues.push({
				type: 'agent-dependency-unresolved',
				sourceAgentId: item.sourceAgentId,
				projectId,
				dependencyType: 'credential',
				referenceId: id,
				path: `config.${path.join('.')}`,
				reason: 'missing',
			});
	});
}

function collectReferences(item: AgentPlanItem, plan: ImportPlan): EntityReference[] {
	const refs: EntityReference[] = [];
	for (const [index, ref] of (item.config?.subAgents?.agents ?? []).entries()) {
		refs.push({
			kind: 'agent',
			id: ref.agentId,
			path: `config.subAgents.agents.${index}.agentId`,
			projectLocal: true,
			setId: (id) => {
				ref.agentId = id;
			},
		});
	}
	for (const tool of extractAgentWorkflowRefs(item.config)) {
		refs.push({
			kind: 'workflow',
			id: tool.workflowId ?? '',
			path: `config.tools.${item.config?.tools?.indexOf(tool)}.workflowId`,
			projectLocal: true,
			setId: (id) => {
				tool.workflowId = id;
			},
		});
	}
	for (const [index, tool] of (item.config?.tools ?? []).entries()) {
		if (tool.type !== 'node') continue;
		const node = { type: tool.node.nodeType, parameters: tool.node.nodeParameters };
		const id = getStaticSubworkflowId(node);
		if (id)
			refs.push({
				kind: 'workflow',
				id,
				path: `config.tools.${index}.node.nodeParameters.workflowId`,
				projectLocal: false,
				setId: (targetId) => setStaticSubworkflowId(node, targetId),
			});
	}
	addRequirements(refs, item, 'agent', plan.input.agentRequirements);
	addRequirements(refs, item, 'workflow', plan.input.subWorkflowRequirements);
	return refs;
}

function addRequirements(
	refs: EntityReference[],
	item: AgentPlanItem,
	kind: EntityReference['kind'],
	requirements?: PackageWorkflowRequirement[],
): void {
	for (const requirement of requirements ?? []) {
		if (
			!requirement.usedBy.some(
				(consumer) => consumer.kind === 'agent' && consumer.id === item.sourceAgentId,
			)
		)
			continue;
		if (refs.some((ref) => ref.kind === kind && ref.id === requirement.id)) continue;
		refs.push({ kind, id: requirement.id, path: `requirements.${kind}s`, projectLocal: true });
	}
}
