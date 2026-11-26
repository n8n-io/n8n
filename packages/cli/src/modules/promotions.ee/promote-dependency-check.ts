import type {
	PromotionBindingConsumer,
	PromotionDependencyWarning,
	PromotionMissingDependency,
} from '@n8n/api-types';

import { PACKAGE_ENTITY_LAYOUT } from '@/modules/n8n-packages/io/manifest-entry';
import type { PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';
import { getWorkflowConsumerIds } from '@/modules/n8n-packages/spec/requirement-consumers';
import type {
	PackageRequirementConsumer,
	PackageRequirementReason,
} from '@/modules/n8n-packages/spec/requirements.schema';

import { isUnder, projectHolding } from './branch-placement';
import { compare, consumersOf, variableKey, type ConsumerWorkflow } from './package-references';

/**
 * The project that owns a dependency. A personal project has no name here, because that name holds
 * the email of its owner.
 */
export type DependencyOwner =
	| { id: string; type: 'personal' }
	| { id: string; type: 'team'; name: string };

export type PromoteDependencyFacts = {
	/** The export of the promoted projects. Its requirement rows hold the references. */
	manifest: PackageManifest;
	promotedProjectIds: ReadonlySet<string>;
	/** `null` when the branch holds no package, or when the Promote replaces the whole package. */
	branchManifest: PackageManifest | null;
	existingCredentialIds: ReadonlySet<string>;
	/** A credential without an entry has no owner project, as an instance credential. */
	credentialOwners: ReadonlyMap<string, DependencyOwner>;
	/** A workflow without an entry does not exist on this instance. */
	workflowOwners: ReadonlyMap<string, DependencyOwner>;
	/** The owner projects on which the user holds `project:read`. */
	readableProjectIds: ReadonlySet<string>;
	/** The credentials and workflows of personal projects that the user can read. */
	readableCredentialIds: ReadonlySet<string>;
	readableWorkflowIds: ReadonlySet<string>;
	/** Every variable of this instance. `projectId` is `null` for a global variable. */
	variables: ReadonlyArray<{ name: string; projectId: string | null }>;
};

export type PromoteDependencyCheck = {
	missingDependencies: PromotionMissingDependency[];
	warnings: PromotionDependencyWarning[];
};

type Placement = Pick<PromotionMissingDependency, 'group' | 'reason' | 'accessible' | 'project'>;

type ConsumersOfRow = (
	usedBy: PackageRequirementConsumer[],
	keep?: (workflow: ConsumerWorkflow) => boolean,
) => PromotionBindingConsumer[];

/**
 * Lists what the promoted workflows use and the branch does not hold after the Promote, and the
 * references to something that this instance does not hold. It names the project of a dependency
 * only when that project is a team project that the user can read. References in expressions are
 * not checked. Nothing in the lists stops the Promote: the caller confirms the missing
 * dependencies instead.
 */
export function checkPromoteDependencies(facts: PromoteDependencyFacts): PromoteDependencyCheck {
	const result: PromoteDependencyCheck = { missingDependencies: [], warnings: [] };
	const consumersOfRow = consumerLookup(facts.manifest);
	addCredentialRows(facts, consumersOfRow, result);
	addWorkflowRows(facts, consumersOfRow, result);
	addVariableRows(facts, consumersOfRow, result);
	// The revision hashes both lists, so their order must not depend on the order of the rows.
	result.missingDependencies.sort(byKindAndId);
	result.warnings.sort(byKindAndId);
	return result;
}

function addCredentialRows(
	facts: PromoteDependencyFacts,
	consumersOfRow: ConsumersOfRow,
	result: PromoteDependencyCheck,
) {
	// A top-level credential file has no owner project, so Apply cannot create the credential.
	const onBranch = new Set(
		(facts.branchManifest?.credentials ?? [])
			.filter(({ target }) => isUnder(target, PACKAGE_ENTITY_LAYOUT.projects.directory))
			.map(({ id }) => id),
	);
	for (const row of facts.manifest.requirements?.credentials ?? []) {
		const consumers = consumersOfRow(row.usedBy);
		if (consumers.length === 0) continue;
		const item = { id: row.id, name: row.name ?? row.id, consumers };
		if (!facts.existingCredentialIds.has(row.id)) {
			result.warnings.push({ kind: 'credential', code: 'missing-on-source', ...item });
			continue;
		}
		const owner = facts.credentialOwners.get(row.id);
		const placement =
			owner &&
			placementOf(facts, owner, {
				onBranch: onBranch.has(row.id),
				readable: facts.readableCredentialIds.has(row.id),
			});
		if (!placement) continue;
		result.missingDependencies.push({
			kind: 'credential',
			...item,
			...(row.type !== undefined ? { credentialType: row.type } : {}),
			...placement,
			blocking: false,
		});
	}
}

/** Sub-workflows and error workflows. */
function addWorkflowRows(
	facts: PromoteDependencyFacts,
	consumersOfRow: ConsumersOfRow,
	result: PromoteDependencyCheck,
) {
	const exported = new Set((facts.manifest.workflows ?? []).map(({ id }) => id));
	const onBranch = new Set((facts.branchManifest?.workflows ?? []).map(({ id }) => id));
	for (const row of facts.manifest.requirements?.workflows ?? []) {
		// The Promote writes a workflow of its export, so the branch holds it afterwards.
		if (exported.has(row.id)) continue;
		const consumers = consumersOfRow(row.usedBy);
		if (consumers.length === 0) continue;
		const item = { id: row.id, name: row.name ?? row.id, consumers };
		const owner = facts.workflowOwners.get(row.id);
		if (!owner) {
			result.warnings.push({ kind: 'workflow', code: 'missing-on-source', ...item });
			continue;
		}
		const placement = placementOf(facts, owner, {
			onBranch: onBranch.has(row.id),
			readable: facts.readableWorkflowIds.has(row.id),
		});
		if (placement) {
			result.missingDependencies.push({ kind: 'workflow', ...item, ...placement, blocking: false });
		}
	}
}

/** A variable never belongs to another project, so it gives only a warning. */
function addVariableRows(
	facts: PromoteDependencyFacts,
	consumersOfRow: ConsumersOfRow,
	result: PromoteDependencyCheck,
) {
	const defined = new Set(
		facts.variables.map(({ name, projectId }) => variableKey(name, projectId)),
	);
	for (const { name, usedBy } of facts.manifest.requirements?.variables ?? []) {
		// A workflow reads the variable of its project first, then the global one.
		const consumers = consumersOfRow(
			usedBy,
			({ projectId }) =>
				!defined.has(variableKey(name, projectId)) && !defined.has(variableKey(name, null)),
		);
		if (consumers.length === 0) continue;
		result.warnings.push({ kind: 'variable', code: 'missing-on-source', name, consumers });
	}
}

/**
 * Writes on the requirement rows why the package does not hold a dependency: the caller confirmed
 * a missing dependency, or the reference is broken on this instance. Apply and a review read it
 * from the branch. A variable row gets no reason. Returns the same manifest when no row changes.
 */
export function markRequirementRows(
	manifest: PackageManifest,
	{ missingDependencies, warnings }: PromoteDependencyCheck,
): PackageManifest {
	const reasons = new Map<string, PackageRequirementReason>();
	for (const { kind, id } of warnings) {
		if (id !== undefined) reasons.set(`${kind}:${id}`, 'missing-on-source');
	}
	for (const { kind, id } of missingDependencies) {
		if (id !== undefined) reasons.set(`${kind}:${id}`, 'confirmed-missing');
	}
	const requirements = reasons.size > 0 ? manifest.requirements : undefined;
	if (!requirements) return manifest;

	const mark = <T extends { id: string }>(kind: 'credential' | 'workflow', rows: T[]) =>
		rows.map((row) => {
			const reason = reasons.get(`${kind}:${row.id}`);
			return reason ? { ...row, reason } : row;
		});
	return {
		...manifest,
		requirements: {
			...requirements,
			...(requirements.credentials && {
				credentials: mark('credential', requirements.credentials),
			}),
			...(requirements.workflows && { workflows: mark('workflow', requirements.workflows) }),
		},
	};
}

/** The manifest with only the requirement rows of the dependencies that a Promote confirmed. */
export function confirmedMissingRows(manifest: PackageManifest): PackageManifest {
	const confirmed = <T extends { reason?: PackageRequirementReason }>(rows: T[] = []) =>
		rows.filter(({ reason }) => reason === 'confirmed-missing');
	return {
		...manifest,
		requirements: {
			credentials: confirmed(manifest.requirements?.credentials),
			workflows: confirmed(manifest.requirements?.workflows),
		},
	};
}

/** How to report a dependency that a project owns. `null` when the Promote does not miss it. */
function placementOf(
	facts: PromoteDependencyFacts,
	owner: DependencyOwner,
	{ onBranch, readable }: { onBranch: boolean; readable: boolean },
): Placement | null {
	if (facts.promotedProjectIds.has(owner.id)) return null;
	// A promotion never carries a personal project, so the branch cannot hold the dependency.
	if (owner.type === 'personal') {
		return { group: 'personal', reason: 'personal-project', accessible: readable };
	}
	if (onBranch) return null;
	if (!facts.readableProjectIds.has(owner.id)) {
		return { group: 'outside-access', reason: 'not-on-branch', accessible: false };
	}
	return {
		group: 'other-project',
		reason: 'not-on-branch',
		accessible: true,
		project: { id: owner.id, name: owner.name },
	};
}

/** Groups the workflows of a requirement row by their project in the export. */
function consumerLookup(manifest: PackageManifest): ConsumersOfRow {
	const projects = new Map((manifest.projects ?? []).map(({ id, name }) => [id, { id, name }]));
	const workflows = new Map<string, ConsumerWorkflow>();
	for (const { id, name, target } of manifest.workflows ?? []) {
		const project = projectHolding(manifest.projects, target);
		if (project) workflows.set(id, { id, name, projectId: project.id });
	}
	return (usedBy, keep = () => true) =>
		consumersOf(
			getWorkflowConsumerIds({ usedBy }).flatMap((id) => {
				const workflow = workflows.get(id);
				return workflow && keep(workflow) ? [workflow] : [];
			}),
			(id) => projects.get(id) ?? { id, name: id },
		);
}

function byKindAndId(
	a: { kind: string; id?: string; name: string },
	b: { kind: string; id?: string; name: string },
): number {
	return compare(a.kind, b.kind) || compare(a.id ?? '', b.id ?? '') || compare(a.name, b.name);
}
