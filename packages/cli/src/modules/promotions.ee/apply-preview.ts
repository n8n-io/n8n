import type {
	PromotionApplyCheck,
	PromotionBindingConflict,
	PromotionBindingConsumer,
	PromotionBindingPreflightResult,
	PromotionResource,
	PromotionResourceChange,
	PromotionVariableScope,
} from '@n8n/api-types';
import { createHash } from 'node:crypto';

import type { PackageImportPlan } from '@/modules/n8n-packages/engine/project-package-importer';
import type {
	InventoryCredential,
	InventoryWorkflow,
	PackageDirectoryInventory,
} from '@/modules/n8n-packages/io/directory/package-directory-inventory-reader';
import { PACKAGE_ENTITY_LAYOUT } from '@/modules/n8n-packages/io/manifest-entry';
import type { BlockingIssue } from '@/modules/n8n-packages/n8n-packages.types';
import type { PackageRequirementConsumer } from '@/modules/n8n-packages/spec/requirements.schema';

import {
	compare,
	consumersOf,
	referenceFiles,
	workflowRefs,
	type CredentialReference,
	type ProjectLookup,
	type VariableReference,
} from './promotion-binding-preflight.service';
import type { CrossProjectMoves } from './cross-project-moves';
import { resourceKey, variableResourceKey } from './promotion-preview';

/** Conflicts that stop every workflow of the project. */
type ProjectWideCode = 'project-conflict' | 'check-not-run' | 'import-blocked';

/** Raise when the preview changes shape, so that a revision from an older version never matches. */
const PREVIEW_SCHEMA_VERSION = 1;

/** What Apply does to a resource, where the import plan decides it rather than the file comparison. */
export type PlannedChange = {
	change: PromotionResourceChange;
	/** The name on this instance, which Apply keeps. */
	name?: string;
	previousName?: string;
	previousId?: string;
};

/**
 * What the plan says for the resources other than workflows, by resource key. Workflows are left
 * to the file comparison: the plan updates every matched workflow, also an unchanged one.
 */
export function plannedChanges(plan: PackageImportPlan): Map<string, PlannedChange> {
	const changes = new Map<string, PlannedChange>();
	for (const item of plan.projectPlan.items) {
		if (item.action === 'skip') {
			changes.set(resourceKey('project', item.sourceProjectId), {
				change: 'unchanged',
				name: item.existingName,
			});
		}
	}
	for (const { project, plan: scope } of plan.scopes) {
		for (const sourceId of scope.credentialPlan.successes.keys()) {
			changes.set(resourceKey('credential', sourceId), { change: 'unchanged' });
		}
		// Apply writes the branch name and expression values to a credential that the project owns.
		for (const { sourceId, targetName, name } of scope.credentialPlan.updates) {
			changes.set(resourceKey('credential', sourceId), {
				change: 'modified',
				...(targetName !== name ? { previousName: targetName } : {}),
			});
		}
		for (const { reason, sourceId } of scope.credentialPlan.failures) {
			if (reason === 'access-required' || reason === 'incompatible-usage-scope') {
				changes.set(resourceKey('credential', sourceId), { change: 'unchanged' });
			}
		}
		for (const { name, scopes } of scope.variablePlan.matched) {
			if (scopes.includes('project')) {
				changes.set(variableResourceKey(name, project.id), { change: 'unchanged' });
			}
			if (scopes.includes('global')) {
				changes.set(variableResourceKey(name, null), { change: 'unchanged' });
			}
		}

		for (const item of scope.folderPlan.items) {
			if (item.action === 'skip') {
				changes.set(resourceKey('folder', item.sourceFolderId), {
					change: 'unchanged',
					...(item.existingName !== undefined ? { name: item.existingName } : {}),
				});
			}
		}

		const { tagPlan } = scope;
		for (const { id } of tagPlan.matched)
			changes.set(resourceKey('tag', id), { change: 'unchanged' });
		for (const { id } of tagPlan.creations)
			changes.set(resourceKey('tag', id), { change: 'added' });
		for (const { id, from } of tagPlan.renames) {
			changes.set(resourceKey('tag', id), { change: 'modified', previousName: from });
		}
		for (const { id, oldId } of tagPlan.reconciles) {
			changes.set(resourceKey('tag', id), { change: 'modified', previousId: oldId });
		}

		const { dataTablePlan } = scope;
		for (const id of dataTablePlan.matched) {
			changes.set(resourceKey('dataTable', id), { change: 'unchanged' });
		}
		for (const { id } of dataTablePlan.columnAlignments) {
			changes.set(resourceKey('dataTable', id), { change: 'unchanged' });
		}
		for (const { id } of dataTablePlan.creations) {
			changes.set(resourceKey('dataTable', id), { change: 'added' });
		}
		for (const { table } of dataTablePlan.updates) {
			changes.set(resourceKey('dataTable', table.id), { change: 'modified' });
		}
		// A destructive change waits for a confirmation, and the table changes once confirmed.
		for (const { kind, sourceId, overwriteChanges } of dataTablePlan.failures) {
			if (kind === 'schema-incompatible' && sourceId && overwriteChanges?.length) {
				changes.set(resourceKey('dataTable', sourceId), { change: 'modified' });
			}
		}
	}
	return changes;
}

/** The package data that the Apply check reads besides the plan. */
export type ApplyCheckInput = {
	plan: PackageImportPlan;
	/** The whole package, so that names of other projects resolve. */
	inventory: PackageDirectoryInventory;
	/** References of the planned workflows, from a scan of their nodes. */
	credentials: CredentialReference[];
	variables: VariableReference[];
	/** The project that project-wide blockers name when the issue names none. */
	projectId: string;
	moves: CrossProjectMoves;
};

/**
 * Describes the issues of the plan in the shape that the Apply check returns, and adds the
 * rules that promotions enforces on top of the import:
 * - a reference without a credential id, or with two credential types, blocks;
 * - a variable must exist in the scope that the branch declares, not only in a fallback scope;
 * - a variable without a file in the package blocks.
 */
export function toApplyCheck(input: ApplyCheckInput): PromotionApplyCheck {
	const { plan, inventory, projectId, moves } = input;
	const projects = new Map(inventory.projects.map((project) => [project.id, project]));
	const projectOf: ProjectLookup = (id) => {
		const project = projects.get(id);
		return project ? { id, name: project.name } : { id, name: id };
	};
	const workflowsById = new Map(inventory.workflows.map((workflow) => [workflow.id, workflow]));
	const consumersOfIds = (consumers: readonly PackageRequirementConsumer[]) =>
		consumersOf(
			consumers.flatMap(({ kind, id }) => {
				const workflow = kind === 'workflow' ? workflowsById.get(id) : undefined;
				return workflow ? [workflow] : [];
			}),
			projectOf,
		);

	const result: PromotionBindingPreflightResult = {
		missingProjects: plan.projectPlan.items
			.filter(({ action }) => action === 'create')
			.flatMap(({ sourceProjectId }) => {
				const project = projects.get(sourceProjectId);
				if (!project) return [];
				const { id, name, icon, description, customTelemetryTags } = project;
				return [
					{
						id,
						name,
						...(icon !== undefined ? { icon } : {}),
						...(description !== undefined ? { description } : {}),
						...(customTelemetryTags !== undefined ? { customTelemetryTags } : {}),
					},
				];
			}),
		missingBindings: [],
		accessRequirements: [],
		conflicts: [],
		warnings: [],
	};

	const handled = new Set<BlockingIssue>();
	addCredentialRules(input, consumersOfIds, projectOf, result, handled);
	addVariableRules(input, projectOf, result, handled);
	// The import reports a move between projects as an id held by another project. The moves list
	// below names both projects, so it reports each move once.
	const movedIds = new Set([...moves.workflows, ...moves.folders].map(({ id }) => id));
	for (const issue of plan.issues) {
		if (
			(issue.type === 'workflow-id-conflict' && movedIds.has(issue.sourceWorkflowId)) ||
			(issue.type === 'folder-conflict' &&
				issue.kind === 'id-in-other-project' &&
				movedIds.has(issue.sourceFolderId))
		) {
			handled.add(issue);
		}
	}

	for (const issue of plan.issues) {
		if (handled.has(issue)) continue;
		result.conflicts.push(
			describeIssue(issue, projectId, { inventory, projectOf, consumersOfIds }),
		);
	}

	return {
		preflight: {
			...result,
			missingBindings: sortedByJson(result.missingBindings),
			accessRequirements: sortedByJson(result.accessRequirements),
			conflicts: sortedByJson(result.conflicts),
			warnings: sortedByJson(result.warnings),
		},
		movedWorkflows: moves.workflows,
		movedFolders: moves.folders,
	};
}

/** Names a blocking issue of the plan. A project-wide issue names `projectId` by default. */
function describeIssue(
	issue: BlockingIssue,
	projectId: string,
	{
		inventory,
		projectOf,
		consumersOfIds,
	}: {
		inventory: PackageDirectoryInventory;
		projectOf: ProjectLookup;
		consumersOfIds: (
			consumers: readonly PackageRequirementConsumer[],
		) => PromotionBindingConsumer[];
	},
): PromotionBindingConflict {
	const projectConflict = (
		code: ProjectWideCode,
		reason: string,
		id = projectId,
	): PromotionBindingConflict => ({ kind: 'project', code, project: projectOf(id), reason });
	const workflowConflict = (
		code: Extract<PromotionBindingConflict, { kind: 'workflow' }>['code'],
		reason: string,
		consumers: PromotionBindingConsumer[],
	): PromotionBindingConflict =>
		consumers.length > 0
			? { kind: 'workflow', code, reason, consumers }
			: projectConflict('import-blocked', reason);
	const ofWorkflow = (id: string) => consumersOfIds([{ kind: 'workflow', id }]);

	switch (issue.type) {
		case 'project-conflict': {
			if (issue.kind !== 'not-team') {
				return projectConflict('project-conflict', issue.kind, issue.sourceProjectId);
			}
			const project = inventory.projects.find(({ id }) => id === issue.sourceProjectId);
			return {
				kind: 'project',
				code: 'project-not-team',
				project: projectOf(issue.sourceProjectId),
				filePath: `${project?.path ?? ''}/${PACKAGE_ENTITY_LAYOUT.projects.fileName}`,
				workflows: workflowRefs(
					inventory.workflows.filter(({ projectId }) => projectId === issue.sourceProjectId),
				),
			};
		}
		case 'policy-check-failed':
			return projectConflict('check-not-run', issue.point);
		case 'workflow-id-conflict':
			return workflowConflict(
				'workflow-id-conflict',
				issue.type,
				ofWorkflow(issue.sourceWorkflowId),
			);
		case 'workflow-lineage-conflict':
			return workflowConflict('lineage-conflict', issue.type, ofWorkflow(issue.sourceWorkflowId));
		case 'policy-violation':
			return workflowConflict(
				'policy-violation',
				issue.violations.map(({ message }) => message).join('; '),
				ofWorkflow(issue.sourceWorkflowId),
			);
		case 'missing-node-type':
			return workflowConflict(
				'missing-node-type',
				`${issue.nodeType}@${issue.typeVersion}`,
				consumersOfIds(issue.usedBy),
			);
		case 'workflow-conflict':
		case 'workflow-archive-forbidden':
			return workflowConflict('workflow-forbidden', issue.type, ofWorkflow(issue.sourceWorkflowId));
		case 'credential-update-forbidden':
			return workflowConflict('workflow-forbidden', issue.type, consumersOfIds(issue.usedBy));
		case 'credential-policy-violation':
			return workflowConflict(
				'policy-violation',
				issue.violations.map(({ message }) => message).join('; '),
				consumersOfIds(issue.usedBy),
			);
		case 'workflow-removal-forbidden':
			// A removed workflow is not in the package, so it is named from the plan.
			return workflowConflict('workflow-forbidden', issue.type, [
				{
					project: projectOf(issue.projectId),
					workflows: [{ id: issue.workflowId, name: issue.name }],
				},
			]);
		case 'data-table-unresolved': {
			const consumers = consumersOfIds(issue.usedBy);
			if (consumers.length === 0) return projectConflict('import-blocked', issue.type);
			if (
				issue.kind === 'schema-incompatible' &&
				issue.sourceId &&
				issue.overwriteChanges?.length
			) {
				return {
					kind: 'data-table',
					code: 'destructive-change',
					id: issue.sourceId,
					name: issue.name ?? issue.sourceId,
					consumers,
					changes: issue.overwriteChanges,
				};
			}
			return {
				kind: 'data-table',
				code: 'data-table-conflict',
				...(issue.sourceId ? { id: issue.sourceId } : {}),
				...(issue.name !== undefined ? { name: issue.name } : {}),
				reason: issue.kind,
				consumers,
			};
		}
		case 'tag-unresolved': {
			const consumers = consumersOfIds(issue.usedBy);
			if (consumers.length === 0) return projectConflict('import-blocked', issue.type);
			return {
				kind: 'tag',
				code: 'tag-conflict',
				...(issue.sourceId ? { id: issue.sourceId } : {}),
				...(issue.name !== undefined ? { name: issue.name } : {}),
				reason: issue.kind,
				consumers,
			};
		}
		default:
			// Apply's policies do not produce the other issues. They still stop the whole project.
			return projectConflict('import-blocked', issue.type);
	}
}

/**
 * Credentials: the node scan finds references without an id or with two types, which the
 * import cannot see. Every other credential issue comes from the plan.
 */
function addCredentialRules(
	{ plan, inventory, credentials }: ApplyCheckInput,
	consumersOfIds: (consumers: readonly PackageRequirementConsumer[]) => PromotionBindingConsumer[],
	projectOf: ProjectLookup,
	result: PromotionBindingPreflightResult,
	handled: Set<BlockingIssue>,
): void {
	const issuesById = new Map<
		string,
		Array<Extract<BlockingIssue, { type: 'credential-unresolved' }>>
	>();
	for (const issue of plan.issues) {
		if (issue.type !== 'credential-unresolved') continue;
		issuesById.set(issue.sourceId, [...(issuesById.get(issue.sourceId) ?? []), issue]);
	}
	const references = new Map(
		credentials.flatMap((ref) => (ref.sourceId ? [[ref.sourceId, ref]] : [])),
	);
	const files = new Map(inventory.credentials.map((file) => [file.credential.id, file]));
	const workflowsById = new Map(inventory.workflows.map((workflow) => [workflow.id, workflow]));

	for (const reference of credentials) {
		const { sourceId, name, expectedTypes, file, workflows } = reference;
		const conflict = {
			kind: 'credential' as const,
			sourceId,
			name,
			expectedTypes,
			consumers: consumersOf(workflows, projectOf),
			...(file ? { filePath: file.path } : {}),
			referenceFiles: referenceFiles(workflows),
		};
		if (sourceId === null) {
			result.conflicts.push({ ...conflict, code: 'missing-id' });
		} else if (expectedTypes.length > 1) {
			result.conflicts.push({ ...conflict, code: 'conflicting-types' });
			for (const issue of issuesById.get(sourceId) ?? []) handled.add(issue);
		}
	}

	type Binding = { reference: CredentialReference; consumers: PromotionBindingConsumer[] };
	const missing = new Map<string, Binding & { file: InventoryCredential; projectId: string }>();
	const access = new Map<string, Binding>();
	for (const [sourceId, issues] of issuesById) {
		const reference = references.get(sourceId);
		if (!reference || reference.expectedTypes.length > 1) continue;
		const file = files.get(sourceId);
		const usedWorkflows = (usedBy: readonly PackageRequirementConsumer[]) =>
			usedBy.flatMap(({ kind, id }) => {
				const workflow = kind === 'workflow' ? workflowsById.get(id) : undefined;
				return workflow ? [workflow] : [];
			});
		const conflict = (issue: (typeof issues)[number]) => ({
			kind: 'credential' as const,
			sourceId,
			name: reference.name,
			expectedTypes: reference.expectedTypes,
			consumers: consumersOfIds(issue.usedBy),
			...(file ? { filePath: file.path } : {}),
			referenceFiles: referenceFiles(usedWorkflows(issue.usedBy)),
		});
		for (const issue of issues) {
			const consumers = consumersOfIds(issue.usedBy);
			if (consumers.length === 0) continue;
			handled.add(issue);
			if (issue.kind === 'unknown_type') {
				result.conflicts.push({ ...conflict(issue), code: 'unknown-type' });
			} else if (issue.kind === 'type_mismatch') {
				result.conflicts.push({
					...conflict(issue),
					code: 'type-mismatch',
					targetType: issue.actualType ?? '',
				});
			} else if (issue.reason === 'incompatible-usage-scope') {
				result.conflicts.push({
					...conflict(issue),
					code: 'incompatible-usage-scope',
					usageScope: 'instance',
				});
			} else if (issue.reason === 'access-required') {
				access.set(sourceId, {
					reference,
					consumers: mergeConsumers(access.get(sourceId)?.consumers, consumers),
				});
			} else if (!file || file.projectId === null) {
				result.conflicts.push({ ...conflict(issue), code: 'unknown-owner' });
			} else {
				missing.set(sourceId, {
					reference,
					file,
					projectId: file.projectId,
					consumers: mergeConsumers(missing.get(sourceId)?.consumers, consumers),
				});
			}
		}
	}

	for (const [sourceId, { reference, consumers }] of access) {
		const { name, expectedTypes } = reference;
		result.accessRequirements.push({
			kind: 'credential',
			code: 'access-required',
			sourceId,
			name,
			credentialType: expectedTypes[0],
			consumers,
		});
	}
	for (const [sourceId, { reference, file, projectId, consumers }] of missing) {
		const { name, expectedTypes } = reference;
		result.missingBindings.push({
			kind: 'credential',
			sourceId,
			name,
			credentialType: expectedTypes[0],
			consumers,
			ownerProject: projectOf(projectId),
			...(file.credential.data !== undefined ? { expressionData: file.credential.data } : {}),
		});
	}
}

/**
 * Variables: a variable must exist in the scope that the branch declares. The import would
 * fall back from a project variable to a global one, which Apply does not accept.
 */
function addVariableRules(
	{ plan, variables }: ApplyCheckInput,
	projectOf: ProjectLookup,
	result: PromotionBindingPreflightResult,
	handled: Set<BlockingIssue>,
): void {
	// Scopes of each matched variable, by consumer project.
	const matched = new Map<string, Map<string, ReadonlyArray<'project' | 'global'>>>();
	for (const { project, plan: scope } of plan.scopes) {
		matched.set(
			project.id,
			new Map(scope.variablePlan.matched.map(({ name, scopes }) => [name, scopes])),
		);
	}
	// The scan below reports every variable it saw. A missing variable that it did not see stays
	// an import issue, so nothing that stops the import is lost.
	const scanned = new Set(variables.map(({ name }) => name));
	for (const issue of plan.issues) {
		if (issue.type === 'variable-unresolved' && scanned.has(issue.name)) handled.add(issue);
	}

	for (const { name, file, workflows } of variables) {
		const consumers = consumersOf(workflows, projectOf);
		if (!file) {
			result.conflicts.push({
				kind: 'variable',
				code: 'missing-definition',
				name,
				consumers,
				referenceFiles: referenceFiles(workflows),
			});
			continue;
		}
		const declared: 'project' | 'global' = file.projectId === null ? 'global' : 'project';
		const scopesIn = (workflow: InventoryWorkflow) =>
			matched.get(workflow.projectId)?.get(name) ?? [];
		if (workflows.some((workflow) => !scopesIn(workflow).includes(declared))) {
			const scope: PromotionVariableScope =
				file.projectId === null
					? { kind: 'global' }
					: { kind: 'project', project: projectOf(file.projectId) };
			result.missingBindings.push({
				kind: 'variable',
				name,
				variableType: file.variable.type,
				scope,
				consumers,
				...(file.variable.value !== undefined ? { sourceValue: file.variable.value } : {}),
			});
		}
		if (declared === 'global') {
			const shadowing = workflows.filter((workflow) => scopesIn(workflow).includes('project'));
			if (shadowing.length > 0) {
				result.warnings.push({
					kind: 'variable',
					code: 'variable-shadowed',
					name,
					scope: { kind: 'global' },
					consumers: consumersOf(shadowing, projectOf),
				});
			}
		}
	}
}

function mergeConsumers(
	existing: PromotionBindingConsumer[] | undefined,
	added: PromotionBindingConsumer[],
): PromotionBindingConsumer[] {
	const byProject = new Map<string, PromotionBindingConsumer>();
	for (const consumer of [...(existing ?? []), ...added]) {
		const current = byProject.get(consumer.project.id);
		const workflows = new Map(
			[...(current?.workflows ?? []), ...consumer.workflows].map((workflow) => [
				workflow.id,
				workflow,
			]),
		);
		byProject.set(consumer.project.id, {
			project: consumer.project,
			workflows: [...workflows.values()].sort((a, b) => compare(a.id, b.id)),
		});
	}
	return [...byProject.values()].sort((a, b) => compare(a.project.id, b.project.id));
}

/** Database lookups can return rows in any order, so the lists are sorted before they are hashed. */
function sortedByJson<T>(entries: T[]): T[] {
	return entries
		.map((entry) => [canonicalJson(entry), entry] as const)
		.sort(([a], [b]) => compare(a, b))
		.map(([, entry]) => entry);
}

/** JSON with object keys in a fixed order, so equal values give equal text. */
function canonicalJson(value: unknown): string {
	return JSON.stringify(value, (_key, nested: unknown) =>
		nested !== null && typeof nested === 'object' && !Array.isArray(nested)
			? Object.fromEntries(Object.entries(nested).sort(([a], [b]) => compare(a, b)))
			: nested,
	);
}

/**
 * A hash of the resources and the check. It leaves out `changes` and `dependencies`: they come
 * from the same data, and `changes` holds a save time.
 */
export function previewRevision(
	resources: PromotionResource[],
	check: PromotionApplyCheck,
): string {
	return createHash('sha256')
		.update(canonicalJson({ schemaVersion: PREVIEW_SCHEMA_VERSION, resources, check }))
		.digest('hex');
}
