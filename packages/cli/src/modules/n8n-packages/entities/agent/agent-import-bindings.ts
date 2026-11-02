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
	AgentImportPlan,
	AgentPlanItem,
} from './agent-import.types';
import type {
	PackageAgentRequirement,
	PackageWorkflowRequirement,
} from '../../spec/requirements.schema';
import type { CredentialImportPlan } from '../credential/credential.types';
import { WorkflowImportMatchService } from '../workflow/workflow-import-match.service';
import type { WorkflowImportPlan } from '../workflow/workflow-import.types';

interface PlannedTarget {
	id: string;
	projectId: string;
	creating: boolean;
	projectPendingCreation: boolean;
}

export interface AgentImportBindingScope {
	input: {
		context: Pick<AgentImportMatchContext, 'user' | 'projectId'>;
		projectPendingCreation?: boolean;
		agentRequirements?: PackageAgentRequirement[];
		subWorkflowRequirements?: PackageWorkflowRequirement[];
	};
	agentPlan?: AgentImportPlan;
	workflowPlan: Pick<WorkflowImportPlan, 'items'>;
	credentialPlan: Pick<CredentialImportPlan, 'successes' | 'stubIds'>;
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

	async resolve<TScope extends AgentImportBindingScope>(
		scopes: TScope[],
	): Promise<Map<TScope, AgentImportPlan>> {
		const agents = new Map<string, PlannedTarget>();
		const workflows = new Map<string, PlannedTarget>();
		for (const scope of scopes) {
			const target = {
				projectId: scope.input.context.projectId,
				projectPendingCreation: scope.input.projectPendingCreation ?? false,
			};
			for (const item of scope.agentPlan?.items ?? []) {
				agents.set(item.sourceAgentId, {
					...target,
					id: item.sourceAgentId,
					creating: item.action === 'create',
				});
			}
			for (const item of scope.workflowPlan.items) {
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
		const plans = new Map<TScope, AgentImportPlan>();
		for (const scope of scopes) {
			const plan = await this.resolveScope(scope, agents, workflows, plannedDestinations);
			if (plan) plans.set(scope, plan);
		}
		await this.addTaskConflicts(plans);
		return plans;
	}

	private async addTaskConflicts(
		plans: ReadonlyMap<AgentImportBindingScope, AgentImportPlan>,
	): Promise<void> {
		const conflicts = await this.agentMatcher.findTaskIdConflicts(
			[...plans.values()].flatMap((plan) => plan.items.filter(({ action }) => action !== 'skip')),
		);
		for (const [scope, plan] of plans) {
			const sourceAgentIds = new Set(plan.items.map(({ sourceAgentId }) => sourceAgentId));
			plan.issues.push(
				...conflicts
					.filter(({ sourceAgentId }) => sourceAgentIds.has(sourceAgentId))
					.map(
						(conflict): AgentImportIssue => ({
							type: 'agent-conflict',
							kind: 'task-id',
							sourceAgentId: conflict.sourceAgentId,
							projectId: scope.input.context.projectId,
							sourceTaskId: conflict.sourceTaskId,
							targetIds: [conflict.conflictingAgentId],
						}),
					),
			);
		}
	}

	private async resolveScope(
		scope: AgentImportBindingScope,
		agents: Map<string, PlannedTarget>,
		workflows: Map<string, PlannedTarget>,
		plannedDestinations: PlannedAgentDestinations,
	): Promise<AgentImportPlan | undefined> {
		const { agentPlan, input, credentialPlan } = scope;
		if (!agentPlan) return undefined;
		const plan: AgentImportPlan = {
			...agentPlan,
			items: agentPlan.items.map((item) =>
				item.action === 'skip' ? item : { ...item, config: structuredClone(item.config) },
			),
			issues: [...agentPlan.issues],
			plannedDestinations,
		};
		const items = plan.items.filter(({ action }) => action !== 'skip');
		if (items.length === 0) return plan;
		const context = { ...input.context, projectPendingCreation: input.projectPendingCreation };
		const credentialBindings = new Map([...credentialPlan.successes, ...credentialPlan.stubIds]);
		const references = new Map(items.map((item) => [item, collectReferences(item, scope)]));
		const all = [...references.values()].flat();
		const idsFor = (kind: EntityReference['kind']) => [
			...new Set(all.filter((ref) => ref.kind === kind && ref.id).map(({ id }) => id)),
		];
		const agentTargets = await this.resolveAgents(context, idsFor('agent'), agents);
		const workflowTargets = await this.resolveWorkflows(context, idsFor('workflow'), workflows);
		for (const [item, refs] of references) {
			bindReferences(
				item,
				refs,
				{ agent: agentTargets, workflow: workflowTargets },
				plan.issues,
				context.projectId,
			);
			bindCredentials(item, credentialBindings, plan.issues, context.projectId);
		}
		return plan;
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
			const target = planned.get(id) ?? external.get(id);
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
	bindings: ReadonlyMap<string, string>,
	issues: AgentImportIssue[],
	projectId: string,
): void {
	visitAgentCredentialReferences(item.config, ({ id, path, managedToken, setId }) => {
		if (!id || id === managedToken) return;
		// Channel credentials come from the destination Agent after validation.
		if (path[0] === 'integrations') return;
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

function collectReferences(item: AgentPlanItem, scope: AgentImportBindingScope): EntityReference[] {
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
	addRequirements(refs, item, 'agent', scope.input.agentRequirements);
	addRequirements(refs, item, 'workflow', scope.input.subWorkflowRequirements);
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
