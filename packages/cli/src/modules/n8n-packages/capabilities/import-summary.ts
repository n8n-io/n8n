import { UnexpectedError } from '@n8n/errors';

import {
	type CredentialSummary,
	nodeTypeLabels,
	type NodeTypeVersion,
	uniqueSorted,
} from './package-requirements';
import type { ImportResult, WorkflowPublishingOutcome } from '../n8n-packages.types';
import type {
	PackageCredentialRequirement,
	PackageRequirements,
} from '../spec/requirements.schema';

export type CredentialNeedingSetup = CredentialSummary & { id: string };

/** The result of a one-workflow import, as the import tool reports it. */
export type ImportedWorkflowPackage = {
	workflowId: string;
	workflowName: string;
	created: boolean;
	/** True when a version of the workflow is live after the import. */
	published: boolean;
	/**
	 * True when the live version is the version that the import wrote. False when no version is
	 * live, or when an earlier version stays live.
	 */
	newVersionLive: boolean;
	credentialsNeedingSetup: CredentialNeedingSetup[];
	missingNodeTypes: string[];
	warnings: string[];
};

/** What the package service reports for the workflow, before the steps after the import. */
export type ImportSummary = Omit<ImportedWorkflowPackage, 'published' | 'newVersionLive'> & {
	publishing: WorkflowPublishingOutcome;
	/** The live version after the import, or null when the workflow is not published. */
	activeVersionId: string | null;
};

type ImportOutcome = Pick<
	ImportResult,
	'workflows' | 'credentials' | 'bindings' | 'tags' | 'dataTables' | 'variables'
>;

/** A credential that the import bound, with its id on this instance. */
function boundCredentials(
	sourceIds: readonly string[],
	result: Pick<ImportResult, 'bindings'>,
	requirements: PackageRequirements | undefined,
): CredentialNeedingSetup[] {
	const bySourceId = new Map<string, PackageCredentialRequirement>(
		(requirements?.credentials ?? []).map((c) => [c.id, c]),
	);
	return sourceIds.flatMap((sourceId) => {
		const requirement = bySourceId.get(sourceId);
		const id = result.bindings.credentials[sourceId];
		if (requirement === undefined || id === undefined) return [];
		return [{ name: requirement.name, type: requirement.type, id }];
	});
}

/**
 * What a re-import kept of the copy that it updated, and which credentials of this instance that
 * the import bound have no value. All empty for a new copy.
 */
export type CopyOutcome = {
	/** Source credential ids that the import bound to the credentials that the copy used. */
	keptCredentialSourceIds: readonly string[];
	/** Source credential ids in whose place the copy used more than one credential. */
	conflictingCredentialSourceIds: readonly string[];
	/** Source data table ids in whose place the copy uses tables of this project. */
	keptDataTableIds: readonly string[];
	/** Credentials of this instance that the import bound and that hold no value. */
	emptyCredentialIds: ReadonlySet<string>;
};

export const NEW_COPY: CopyOutcome = {
	keptCredentialSourceIds: [],
	conflictingCredentialSourceIds: [],
	keptDataTableIds: [],
	emptyCredentialIds: new Set(),
};

type CredentialOutcome = Pick<ImportResult, 'credentials' | 'bindings'>;

/** The ids on this instance of the existing credentials that the import bound. */
export function matchedCredentialIds(result: CredentialOutcome): string[] {
	return result.credentials.matched.flatMap((sourceId) => {
		const id = result.bindings.credentials[sourceId];
		return id === undefined ? [] : [id];
	});
}

function matchedWithoutValue(result: CredentialOutcome, copy: CopyOutcome): string[] {
	return result.credentials.matched.filter((sourceId) => {
		const id = result.bindings.credentials[sourceId];
		return id !== undefined && copy.emptyCredentialIds.has(id);
	});
}

/**
 * The credentials that the workflow uses and that hold no value, with their ids on this instance:
 * the stubs that this import created, then the existing credentials without a value, for example
 * a stub of an earlier import. The user must set them up before the workflow can run.
 */
export function credentialsNeedingSetup(
	result: CredentialOutcome,
	requirements: PackageRequirements | undefined,
	copy: CopyOutcome = NEW_COPY,
): CredentialNeedingSetup[] {
	const sourceIds = [...result.credentials.stubbed, ...matchedWithoutValue(result, copy)];
	return boundCredentials(sourceIds, result, requirements);
}

/**
 * The existing credentials that the import bound by name and type. A package from another
 * instance can use a common name, so the user must see which secret the copy now uses. The
 * credentials that the copy used, and the credentials without a value, are left out: the user
 * chose the first ones, and the setup list names the second ones.
 */
function matchedCredentialsWarning(
	result: CredentialOutcome,
	requirements: PackageRequirements | undefined,
	copy: CopyOutcome,
): string | undefined {
	const leftOut = new Set([...copy.keptCredentialSourceIds, ...matchedWithoutValue(result, copy)]);
	const sourceIds = result.credentials.matched.filter((sourceId) => !leftOut.has(sourceId));
	const matched = boundCredentials(sourceIds, result, requirements);
	if (matched.length === 0) return undefined;
	const list = matched.map(({ name, type, id }) => `${name} (${type}, ID ${id})`).join(', ');
	return `The workflow now uses ${matched.length} credential(s) that this instance already had with the same name and type: ${list}. Make sure that they are the right ones before the workflow runs.`;
}

/** The credentials of the package in whose place the copy used more than one credential. */
function conflictingCredentialsWarning(
	copy: CopyOutcome,
	requirements: PackageRequirements | undefined,
): string | undefined {
	const bySourceId = new Map((requirements?.credentials ?? []).map((c) => [c.id, c]));
	const conflicting = copy.conflictingCredentialSourceIds.flatMap((sourceId) => {
		const requirement = bySourceId.get(sourceId);
		return requirement === undefined ? [] : [`${requirement.name} (${requirement.type})`];
	});
	if (conflicting.length === 0) return undefined;
	return `The copy used different credentials in different nodes in place of ${conflicting.length} credential(s) of the package: ${conflicting.join(', ')}. The import can keep only one credential for each, so it matched them by name and type again. Check the credentials in the workflow.`;
}

type DataTableOutcome = ImportOutcome['dataTables'];

/**
 * The data tables that the workflow uses but that the import neither found nor created. A table
 * in whose place the copy uses a table of this project is not missing.
 */
function missingDataTablesWarning(
	outcome: DataTableOutcome,
	requirements: PackageRequirements | undefined,
	keptDataTableIds: readonly string[],
): string | undefined {
	const kept = new Set(keptDataTableIds);
	const required = (requirements?.dataTables ?? []).filter(({ id }) => !kept.has(id));
	const missing = required.length - outcome.matched - outcome.created;
	if (missing <= 0) return undefined;
	const names = uniqueSorted(required.map(({ name }) => name)).join(', ');
	return `${missing} of the ${required.length} data table(s) that the workflow uses are not in the target project, and the import did not create them. The workflow uses: ${names}. Create the missing tables, then select them in the workflow.`;
}

/** The variables that the workflow uses but that this instance does not have. */
function missingVariablesWarning(outcome: ImportOutcome['variables']): string | undefined {
	const missing = uniqueSorted(outcome.missing);
	if (missing.length === 0) return undefined;
	return `The workflow uses ${missing.length} variable(s) that this instance does not have: ${missing.join(', ')}. Create them before the workflow runs.`;
}

/** What the import left out, created empty or bound, so that the user can complete the copy. */
export function importWarnings(
	result: Omit<ImportOutcome, 'workflows'>,
	requirements: PackageRequirements | undefined,
	copy: CopyOutcome = NEW_COPY,
): string[] {
	const warnings: (string | undefined)[] = [];
	const skippedTags = uniqueSorted(result.tags.skipped);
	if (skippedTags.length > 0) {
		warnings.push(
			`The import did not add ${skippedTags.length} tag(s), because this instance does not have them: ${skippedTags.join(', ')}.`,
		);
	}
	if (result.dataTables.created > 0) {
		warnings.push(
			`The import created ${result.dataTables.created} empty data table(s) for the workflow. The package holds no rows.`,
		);
	}
	warnings.push(
		missingDataTablesWarning(result.dataTables, requirements, copy.keptDataTableIds),
		missingVariablesWarning(result.variables),
		matchedCredentialsWarning(result, requirements, copy),
		conflictingCredentialsWarning(copy, requirements),
	);
	return warnings.filter((warning) => warning !== undefined);
}

type ImportSummaryInput = {
	result: ImportOutcome;
	sourceWorkflowId: string;
	requirements: PackageRequirements | undefined;
	missingNodeTypes: readonly NodeTypeVersion[];
	/** Defaults to the outcome of a new copy. */
	copy?: CopyOutcome;
};

/** The outcome of importing a one-workflow package, as the package service reports it. */
export function summariseImport(input: ImportSummaryInput): ImportSummary {
	const { result, sourceWorkflowId, requirements, missingNodeTypes, copy = NEW_COPY } = input;
	const workflow = result.workflows.find((w) => w.sourceWorkflowId === sourceWorkflowId);
	if (workflow === undefined) {
		throw new UnexpectedError('The import result does not include the workflow of the package', {
			extra: { sourceWorkflowId },
		});
	}
	return {
		workflowId: workflow.localId,
		workflowName: workflow.name,
		created: workflow.status === 'created',
		credentialsNeedingSetup: credentialsNeedingSetup(result, requirements, copy),
		missingNodeTypes: nodeTypeLabels(missingNodeTypes),
		warnings: importWarnings(result, requirements, copy),
		publishing: workflow.publishing,
		activeVersionId: workflow.activeVersionId,
	};
}
