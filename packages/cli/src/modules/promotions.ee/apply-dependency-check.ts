import type { PromotionMissingDependency, PromotionMissingDependencyReason } from '@n8n/api-types';
import type { IWorkflowSettings, WorkflowSettings } from 'n8n-workflow';

import type {
	InventoryWorkflow,
	PackageDirectoryInventory,
} from '@/modules/n8n-packages/io/directory/package-directory-inventory-reader';
import type { PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';

import {
	compare,
	consumersOf,
	type ProjectLookup,
	type WorkflowReference,
} from './package-references';
import { canonicalJson } from './promotion-preview';

/** What the check reads of a workflow that another workflow references. */
export type ReferencedWorkflowState = {
	isArchived: boolean;
	settings?: Pick<IWorkflowSettings, 'callerPolicy' | 'callerIds'>;
	/** The project that holds the workflow. `null` when this instance records no owner. */
	projectId: string | null;
};

/** What the list of missing dependencies needs to know about this instance and about the user. */
export type ApplyDependencyFacts = {
	/** The package projects in which the user can create a credential. */
	credentialProjectIds: ReadonlySet<string>;
	/** The workflows that the Apply imports. The branch gives their state after the Apply. */
	appliedWorkflowIds: ReadonlySet<string>;
	/** The other referenced workflows that this instance holds after the Apply. */
	instanceWorkflows: ReadonlyMap<string, ReferencedWorkflowState>;
	/** The projects on which the user holds `project:read`. */
	readableProjectIds: ReadonlySet<string>;
	callerPolicyDefault: WorkflowSettings.CallerPolicy;
};

type Placement = Pick<PromotionMissingDependency, 'group' | 'reason' | 'accessible'>;

/** The group follows the access: the user can only act on a dependency in a project they access. */
export function placementOf(
	reason: PromotionMissingDependencyReason,
	accessible: boolean,
): Placement {
	return { group: accessible ? 'needs-action' : 'outside-access', reason, accessible };
}

/**
 * Whether a workflow accepts a start from another workflow, as its sub-workflow or as its error
 * workflow. It gives the same answer as the check that runs before both executions.
 */
export function callerPolicyAllows(
	subWorkflow: Pick<ReferencedWorkflowState, 'settings' | 'projectId'>,
	caller: { id: string; projectId: string },
	defaultPolicy: WorkflowSettings.CallerPolicy,
): boolean {
	const policy = subWorkflow.settings?.callerPolicy ?? defaultPolicy;
	if (policy === 'any') return true;
	if (policy === 'workflowsFromAList') {
		// A package file can hold any value here.
		const callerIds = subWorkflow.settings?.callerIds;
		if (typeof callerIds !== 'string') return false;
		return callerIds
			.split(',')
			.map((id) => id.trim())
			.includes(caller.id);
	}
	return policy === 'workflowsFromSameOwner' && subWorkflow.projectId === caller.projectId;
}

/**
 * Lists the sub-workflows and error workflows that the applied workflows reference, and that
 * they cannot use after the Apply. Apply does not check these references, so an entry never
 * stops it.
 */
export function missingWorkflowDependencies({
	references,
	inventory,
	manifest,
	facts,
	projectOf,
}: {
	references: WorkflowReference[];
	/** The whole package. */
	inventory: PackageDirectoryInventory;
	manifest: PackageManifest;
	facts: ApplyDependencyFacts;
	projectOf: ProjectLookup;
}): PromotionMissingDependency[] {
	const onBranch = new Map(inventory.workflows.map((workflow) => [workflow.id, workflow]));
	// The name on this instance can belong to a workflow that the user cannot read.
	const names = new Map(
		(manifest.requirements?.workflows ?? []).map(({ id, name }) => [id, name ?? id]),
	);

	return references.flatMap(({ id, workflows }) => {
		const branchWorkflow = onBranch.get(id);
		const target =
			branchWorkflow && facts.appliedWorkflowIds.has(id)
				? branchState(branchWorkflow)
				: facts.instanceWorkflows.get(id);
		const unusable = unusableFor(target, workflows, facts.callerPolicyDefault);
		if (!unusable) return [];

		// A workflow that only the branch holds is in the project that the branch gives it.
		const holderId = target ? target.projectId : (branchWorkflow?.projectId ?? null);
		const accessible =
			holderId !== null &&
			(facts.readableProjectIds.has(holderId) ||
				unusable.workflows.some(({ projectId }) => projectId === holderId));
		return [
			{
				kind: 'workflow',
				id,
				name: names.get(id) ?? id,
				...placementOf(unusable.reason, accessible),
				blocking: false,
				consumers: consumersOf(unusable.workflows, projectOf),
			},
		];
	});
}

/** Why workflows cannot use a referenced workflow, and which ones. `null` when all of them can. */
function unusableFor(
	target: ReferencedWorkflowState | undefined,
	workflows: InventoryWorkflow[],
	defaultPolicy: WorkflowSettings.CallerPolicy,
): { reason: PromotionMissingDependencyReason; workflows: InventoryWorkflow[] } | null {
	if (!target) return { reason: 'not-on-instance', workflows };
	if (target.isArchived) return { reason: 'archived', workflows };
	// The start of an error workflow obeys the caller policy, as a call from a node does.
	const refused = workflows.filter((caller) => !callerPolicyAllows(target, caller, defaultPolicy));
	return refused.length > 0 ? { reason: 'caller-policy', workflows: refused } : null;
}

function branchState({ content, projectId }: InventoryWorkflow): ReferencedWorkflowState {
	return { isArchived: content.isArchived, settings: content.settings, projectId };
}

/** The preview revision hashes the list, so its order must not depend on the order of a lookup. */
export function sortDependencies(
	dependencies: PromotionMissingDependency[],
): PromotionMissingDependency[] {
	return dependencies
		.map((dependency) => [canonicalJson(dependency.consumers), dependency] as const)
		.sort(
			([aConsumers, a], [bConsumers, b]) =>
				compare(a.kind, b.kind) ||
				compare(a.id ?? '', b.id ?? '') ||
				compare(a.name, b.name) ||
				compare(a.reason, b.reason) ||
				compare(aConsumers, bConsumers),
		)
		.map(([, dependency]) => dependency);
}
