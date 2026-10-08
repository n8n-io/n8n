import { UnexpectedError } from '@n8n/errors';

import {
	type CredentialSummary,
	nodeTypeLabels,
	type NodeTypeVersion,
	uniqueSorted,
} from './package-requirements';
import type { ImportResult, WorkflowPublishingOutcome } from '../n8n-packages.types';
import type { PackageCredentialRequirement, PackageRequirements } from '../spec/requirements.schema';

export type CredentialNeedingSetup = CredentialSummary & { id: string };

/** The result of a one-workflow import, as the import tool reports it. */
export type ImportedWorkflowPackage = {
	workflowId: string;
	workflowName: string;
	created: boolean;
	/** True when a version of the workflow is live after the import. */
	published: boolean;
	credentialsNeedingSetup: CredentialNeedingSetup[];
	missingNodeTypes: string[];
	warnings: string[];
};

/** What the package service reports for the workflow, before the steps after the import. */
export type ImportSummary = Omit<ImportedWorkflowPackage, 'published'> & {
	publishing: WorkflowPublishingOutcome;
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
 * The stub credentials that this import created, with their new ids. A stub has no data, so the
 * user must set it up before the workflow can run.
 */
export function credentialsNeedingSetup(
	result: Pick<ImportResult, 'credentials' | 'bindings'>,
	requirements: PackageRequirements | undefined,
): CredentialNeedingSetup[] {
	return boundCredentials(result.credentials.stubbed, result, requirements);
}

/**
 * The existing credentials that the import bound by name and type. A package from another
 * instance can use a common name, so the user must see which secret the copy now uses.
 */
function matchedCredentialsWarning(
	result: Pick<ImportResult, 'credentials' | 'bindings'>,
	requirements: PackageRequirements | undefined,
): string | undefined {
	const matched = boundCredentials(result.credentials.matched, result, requirements);
	if (matched.length === 0) return undefined;
	const list = matched.map(({ name, type, id }) => `${name} (${type}, ID ${id})`).join(', ');
	return `The workflow now uses ${matched.length} credential(s) that this instance already had with the same name and type: ${list}. Make sure that they are the right ones before the workflow runs.`;
}

type DataTableOutcome = ImportOutcome['dataTables'];

/** The data tables that the workflow uses but that the import neither found nor created. */
function missingDataTablesWarning(
	outcome: DataTableOutcome,
	requirements: PackageRequirements | undefined,
): string | undefined {
	const required = requirements?.dataTables ?? [];
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
): string[] {
	const warnings: Array<string | undefined> = [];
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
		missingDataTablesWarning(result.dataTables, requirements),
		missingVariablesWarning(result.variables),
		matchedCredentialsWarning(result, requirements),
	);
	return warnings.filter((warning) => warning !== undefined);
}

type ImportSummaryInput = {
	result: ImportOutcome;
	sourceWorkflowId: string;
	requirements: PackageRequirements | undefined;
	missingNodeTypes: readonly NodeTypeVersion[];
};

/** The outcome of importing a one-workflow package, as the package service reports it. */
export function summariseImport(input: ImportSummaryInput): ImportSummary {
	const { result, sourceWorkflowId, requirements, missingNodeTypes } = input;
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
		credentialsNeedingSetup: credentialsNeedingSetup(result, requirements),
		missingNodeTypes: nodeTypeLabels(missingNodeTypes),
		warnings: importWarnings(result, requirements),
		publishing: workflow.publishing,
	};
}
