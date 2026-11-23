import { GlobalConfig } from '@n8n/config';
import { SharedWorkflowRepository, WorkflowRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';

import type { PackageImportPlan } from '@/modules/n8n-packages/engine/project-package-importer';
import type {
	InventoryWorkflow,
	PackageDirectoryInventory,
} from '@/modules/n8n-packages/io/directory/package-directory-inventory-reader';
import { ProjectService } from '@/services/project.service.ee';

import type { ApplyDependencyFacts, ReferencedWorkflowState } from './apply-dependency-check';
import type { WorkflowReference } from './package-references';

/** Reads what the list of missing dependencies of an Apply needs to know about this instance. */
@Service()
export class ApplyDependencyCheckService {
	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly projectService: ProjectService,
		private readonly globalConfig: GlobalConfig,
	) {}

	async facts({
		plan,
		inventory,
		applied,
		references,
		wholeInstance,
		selectionOpen,
	}: {
		plan: PackageImportPlan;
		/** The whole package. */
		inventory: PackageDirectoryInventory;
		/** The workflows that the plan imports. */
		applied: InventoryWorkflow[];
		/** The workflows that `applied` reference. */
		references: WorkflowReference[];
		/** An Apply of the whole instance deletes the team projects that the package lacks. */
		wholeInstance: boolean;
		/** The user applies a selection of the plan, which the caller does not know yet. */
		selectionOpen: boolean;
	}): Promise<ApplyDependencyFacts> {
		const { user } = plan.request;
		const appliedWorkflowIds = new Set(applied.map(({ id }) => id));
		const referencedIds = new Set(references.map(({ id }) => id));
		// With an open selection, a workflow of the plan can stay as this instance holds it.
		const { instanceWorkflows, removedWorkflowIds } = await this.instanceWorkflows(
			[...referencedIds].filter((id) => selectionOpen || !appliedWorkflowIds.has(id)),
			plan,
			wholeInstance ? new Set(inventory.projects.map(({ id }) => id)) : null,
		);
		const holders = [
			...inventory.workflows.filter(({ id }) => referencedIds.has(id)),
			...instanceWorkflows.values(),
		];
		const [credentialProjectIds, readableProjectIds] = await Promise.all([
			this.credentialProjectIds(user, missingCredentialProjectIds(plan, inventory)),
			this.readableProjectIds(user, projectIdsOf(holders)),
		]);

		return {
			credentialProjectIds,
			appliedWorkflowIds,
			removedWorkflowIds,
			selectableWorkflowIds: new Set(
				selectionOpen ? [...appliedWorkflowIds, ...removedWorkflowIds] : [],
			),
			instanceWorkflows,
			readableProjectIds,
			callerPolicyDefault: this.globalConfig.workflows.callerPolicyDefaultOption,
		};
	}

	/**
	 * The state of the workflows on this instance before the Apply, and the ones that the Apply
	 * deletes. A deleted workflow keeps its state here, because its project decides who can act.
	 */
	private async instanceWorkflows(
		workflowIds: string[],
		plan: PackageImportPlan,
		keptTeamProjectIds: ReadonlySet<string> | null,
	): Promise<{
		instanceWorkflows: Map<string, ReferencedWorkflowState>;
		removedWorkflowIds: Set<string>;
	}> {
		const instanceWorkflows = new Map<string, ReferencedWorkflowState>();
		const removedWorkflowIds = new Set<string>();
		if (workflowIds.length === 0) return { instanceWorkflows, removedWorkflowIds };
		const [workflows, owners] = await Promise.all([
			this.workflowRepository.findByIds(workflowIds, { fields: ['isArchived', 'settings'] }),
			this.sharedWorkflowRepository.findOwnerProjectsByWorkflowIds(workflowIds),
		]);
		const plannedRemovalIds = new Set(
			plan.scopes.flatMap(({ plan: scope }) => scope.removalPlan.removals.map(({ id }) => id)),
		);

		for (const { id, isArchived, settings } of workflows) {
			const owner = owners.get(id);
			const inDeletedProject =
				keptTeamProjectIds !== null && owner?.type === 'team' && !keptTeamProjectIds.has(owner.id);
			if (plannedRemovalIds.has(id) || inDeletedProject) removedWorkflowIds.add(id);
			instanceWorkflows.set(id, { isArchived, settings, projectId: owner?.id ?? null });
		}
		return { instanceWorkflows, removedWorkflowIds };
	}

	/**
	 * The package projects in which the user can create a credential. A user who can create
	 * projects can first create a project that this instance lacks.
	 */
	private async credentialProjectIds(user: User, projectIds: string[]): Promise<Set<string>> {
		if (projectIds.length === 0) return new Set();
		const [creatable, existing] = await Promise.all([
			this.projectService.getProjectIdsWithScope(user, ['credential:create'], projectIds),
			hasGlobalScope(user, 'project:create')
				? this.projectService.findExistingProjectIds(projectIds)
				: null,
		]);
		return new Set([
			...creatable,
			...(existing ? projectIds.filter((id) => !existing.has(id)) : []),
		]);
	}

	private async readableProjectIds(user: User, projectIds: string[]): Promise<Set<string>> {
		if (projectIds.length === 0) return new Set();
		// A project that the Apply creates is not on this instance yet.
		if (hasGlobalScope(user, 'project:read')) return new Set(projectIds);
		return new Set(
			await this.projectService.getProjectIdsWithScope(user, ['project:read'], projectIds),
		);
	}
}

/** Only a credential that the plan did not find needs the access to its owner project. */
function missingCredentialProjectIds(
	plan: PackageImportPlan,
	inventory: PackageDirectoryInventory,
): string[] {
	const unresolvedIds = new Set(
		plan.issues.flatMap((issue) => (issue.type === 'credential-unresolved' ? issue.sourceId : [])),
	);
	return projectIdsOf(
		inventory.credentials.filter(({ credential }) => unresolvedIds.has(credential.id)),
	);
}

function projectIdsOf(entries: ReadonlyArray<{ projectId: string | null }>): string[] {
	return [...new Set(entries.flatMap(({ projectId }) => projectId ?? []))];
}
