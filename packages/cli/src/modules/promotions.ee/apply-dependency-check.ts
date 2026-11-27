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
	/** The referenced workflows that the Apply deletes. A reference to one does not resolve after it. */
	removedWorkflowIds: ReadonlySet<string>;
	/**
	 * The workflows that the Apply imports or deletes only when the user selects them. The preview
	 * of a project plans every workflow of the project, but the user applies a selection. Empty when
	 * the selection is known.
	 */
	selectableWorkflowIds: ReadonlySet<string>;
	/**
	 * The state on this instance, before the Apply, of the referenced workflows. It can leave out a
	 * workflow that the Apply imports and that the user does not select.
	 */
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

/** A referenced workflow as this instance holds it before the Apply, or after it. */
type Target = {
	/** Absent when this instance does not hold the workflow in that state. */
	state?: ReferencedWorkflowState;
	/** The project that holds the workflow, or that held it before the Apply deleted it. */
	holderId: string | null;
	/** Why the workflow is absent. */
	missing: Extract<PromotionMissingDependencyReason, 'not-on-instance' | 'not-on-branch'>;
};

/** Why workflows cannot use a referenced workflow, and which ones. */
type Finding = Pick<PromotionMissingDependency, 'reason' | 'accessible' | 'condition'> & {
	workflows: InventoryWorkflow[];
};

/**
 * Lists the sub-workflows and error workflows that the applied workflows reference, and that
 * they cannot use after the Apply. Apply does not check these references, so an entry never
 * stops it.
 *
 * For a workflow of `selectableWorkflowIds`, the answer can depend on the selection. An entry
 * then holds a `condition`, and a reason that differs between the two cases gives two entries.
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
		const instanceWorkflow = facts.instanceWorkflows.get(id);
		const missing = instanceWorkflow || branchWorkflow ? 'not-on-instance' : 'not-on-branch';
		// A workflow that only the branch holds is in the project that the branch gives it.
		const kept: Target = instanceWorkflow
			? { state: instanceWorkflow, holderId: instanceWorkflow.projectId, missing }
			: { holderId: branchWorkflow?.projectId ?? null, missing };
		const changed = changedTarget(id, branchWorkflow, kept, facts);

		const findings =
			changed && facts.selectableWorkflowIds.has(id)
				? bySelection(
						findingFor(changed, workflows, facts),
						// A workflow uses itself only in an Apply that includes it.
						findingFor(
							kept,
							workflows.filter((workflow) => workflow.id !== id),
							facts,
						),
					)
				: [findingFor(changed ?? kept, workflows, facts)];

		return findings.flatMap((finding) => {
			if (!finding) return [];
			const { reason, accessible, condition, workflows: consumers } = finding;
			return [
				{
					kind: 'workflow',
					id,
					name: names.get(id) ?? id,
					...placementOf(reason, accessible),
					blocking: false,
					...(condition ? { condition } : {}),
					consumers: consumersOf(consumers, projectOf),
				},
			];
		});
	});
}

/** The workflow after an Apply that writes or deletes it. `undefined` when the Apply does neither. */
function changedTarget(
	id: string,
	branchWorkflow: InventoryWorkflow | undefined,
	kept: Target,
	facts: ApplyDependencyFacts,
): Target | undefined {
	if (branchWorkflow && facts.appliedWorkflowIds.has(id)) {
		return { ...kept, state: branchState(branchWorkflow), holderId: branchWorkflow.projectId };
	}
	// The group of a deleted workflow follows the project that held it.
	return facts.removedWorkflowIds.has(id)
		? { holderId: kept.holderId, missing: kept.missing }
		: undefined;
}

function findingFor(
	target: Target,
	workflows: InventoryWorkflow[],
	facts: ApplyDependencyFacts,
): Finding | null {
	const unusable = unusableFor(target, workflows, facts.callerPolicyDefault);
	if (!unusable) return null;
	const { holderId } = target;
	const accessible =
		holderId !== null &&
		(facts.readableProjectIds.has(holderId) ||
			unusable.workflows.some(({ projectId }) => projectId === holderId));
	return { ...unusable, accessible };
}

/**
 * Splits the findings of the two cases of a selection: it includes the referenced workflow, or it
 * does not. A workflow with the same finding in both cases needs no condition.
 */
function bySelection(selected: Finding | null, notSelected: Finding | null): Finding[] {
	const same =
		selected !== null &&
		notSelected !== null &&
		selected.reason === notSelected.reason &&
		selected.accessible === notSelected.accessible;
	const idsOf = (finding: Finding | null) => new Set(finding?.workflows.map(({ id }) => id));
	const selectedIds = idsOf(selected);
	const notSelectedIds = idsOf(notSelected);
	const inBoth = ({ id }: InventoryWorkflow) =>
		same && selectedIds.has(id) && notSelectedIds.has(id);

	const split = (
		finding: Finding | null,
		condition: Finding['condition'],
		keep: (workflow: InventoryWorkflow) => boolean,
	): Finding[] => {
		const workflows = finding?.workflows.filter(keep) ?? [];
		return finding && workflows.length > 0 ? [{ ...finding, condition, workflows }] : [];
	};
	return [
		...split(selected, undefined, inBoth),
		...split(selected, 'target-selected', (workflow) => !inBoth(workflow)),
		...split(notSelected, 'target-not-selected', (workflow) => !inBoth(workflow)),
	];
}

/** Why workflows cannot use a referenced workflow, and which ones. `null` when all of them can. */
function unusableFor(
	{ state, missing }: Target,
	workflows: InventoryWorkflow[],
	defaultPolicy: WorkflowSettings.CallerPolicy,
): Pick<Finding, 'reason' | 'workflows'> | null {
	if (workflows.length === 0) return null;
	if (!state) return { reason: missing, workflows };
	if (state.isArchived) return { reason: 'archived', workflows };
	// The start of an error workflow obeys the caller policy, as a call from a node does.
	const refused = workflows.filter((caller) => !callerPolicyAllows(state, caller, defaultPolicy));
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
				compare(a.condition ?? '', b.condition ?? '') ||
				compare(aConsumers, bConsumers),
		)
		.map(([, dependency]) => dependency);
}
