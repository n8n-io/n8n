import type { EventService } from '@/events/event.service';

import type { CredentialBindingRequest } from '../entities/credential/credential.types';
import type { DataTableImportRequest } from '../entities/data-table/data-table.types';
import type { TagImportPlan, TagImportRequest } from '../entities/tag/tag.types';
import type { VariableImportRequest } from '../entities/variable/variable.types';
import type { PersistedWorkflowOutcome } from '../entities/workflow/workflow-import.types';
import { VariableParentPolicy } from '../n8n-packages.types';
import type { ImportContext, ImportPackageRequest } from '../n8n-packages.types';
import type { ImportContentResult } from './import-orchestrator';
import { reconcileVariableSummary } from './import-result';
import type { PackageManifest } from '../spec/manifest.schema';

export interface PackageImportScope {
	context: ImportContext;
	/** The apply phase's output — telemetry counts what was written, not what was published. */
	imported: ImportContentResult;
	credentialRequest: CredentialBindingRequest;
	dataTableRequest: DataTableImportRequest;
	variableRequest: VariableImportRequest;
	tagRequest: TagImportRequest;
}

export function emitPackageImportedEvent(
	eventService: EventService,
	params: {
		request: ImportPackageRequest;
		manifest: PackageManifest;
		scopes: PackageImportScope[];
	},
): void {
	const { request, manifest, scopes } = params;

	const workflowOutcomes = scopes.flatMap(({ imported }) => imported.workflowOutcomes);
	const credentialResults = scopes.map(({ imported }) => imported.credentialResult);
	const importedWorkflows = workflowOutcomes.filter(({ status }) => status !== 'skipped');
	const countByStatus = (status: PersistedWorkflowOutcome['status']) =>
		workflowOutcomes.filter((outcome) => outcome.status === status).length;
	const credentialRequirements = scopes.reduce(
		(total, { credentialRequest }) => total + (credentialRequest.requirements?.length ?? 0),
		0,
	);

	const matchedCredentialIds = credentialResults.flatMap(({ matched, bindings }) =>
		matched.map((sourceId) => bindings.get(sourceId)!),
	);
	const createdCredentialIds = credentialResults.flatMap(({ stubbed, bindings }) =>
		stubbed.map((sourceId) => bindings.get(sourceId)!),
	);

	const dataTablePlans = scopes.map(({ imported }) => imported.dataTablePlan);
	const dataTableRequirements = scopes.reduce(
		(total, { dataTableRequest }) => total + (dataTableRequest.requirements?.length ?? 0),
		0,
	);
	const dataTablesMatched = dataTablePlans.reduce((total, plan) => total + plan.matchedCount, 0);
	const dataTablesCreated = dataTablePlans.reduce(
		(total, plan) => total + plan.creations.length,
		0,
	);

	const variableRequirements = scopes.reduce(
		(total, { variableRequest }) => total + (variableRequest.requirements?.length ?? 0),
		0,
	);
	// Reconciled once across every scope, by the same helper the API response uses, so a name one
	// scope stubbed and another found occupied is not also reported as pre-existing.
	const variableSummary = reconcileVariableSummary({
		matched: scopes.flatMap(({ imported }) => imported.variablePlan.matched),
		missing: scopes.flatMap(({ imported }) =>
			imported.variablePlan.missing.map(({ name }) => name),
		),
		stubbed: scopes.flatMap(({ imported }) => imported.variableResult.stubbed),
		skipped: scopes.flatMap(({ imported }) => imported.variableResult.skippedExisting),
	});
	const variablesCreated = scopes.reduce(
		(total, { imported }) => total + imported.variableResult.createdCount,
		0,
	);

	// Tags are global, so several scopes may plan the same tag; count each id once.
	const tagPlans = scopes.map(({ imported }) => imported.tagPlan);
	const uniqueTagIds = (pick: (plan: TagImportPlan) => Array<{ id: string }>) =>
		new Set(tagPlans.flatMap((plan) => pick(plan).map(({ id }) => id))).size;
	const tagRequirements = new Set(
		scopes.flatMap(({ tagRequest }) => (tagRequest.requirements ?? []).map(({ id }) => id)),
	).size;

	const folderId = scopes.length === 1 ? scopes[0].context.folderId : null;

	eventService.emit('n8n-package-imported', {
		user: request.user,
		projectIds: scopes.map(({ context }) => context.projectId),
		folderId,
		workflowIds: importedWorkflows.map(({ workflow }) => workflow.id),
		options: {
			workflowConflictPolicy: request.workflowConflictPolicy,
			workflowIdPolicy: request.workflowIdPolicy,
			credentialMatchingMode: request.credentialMatchingMode,
			credentialMissingMode: request.credentialMissingMode,
			workflowPublishingPolicy: request.workflowPublishingPolicy,
			missingNodeTypeMode: request.missingNodeTypeMode,
			dataTableMatchingMode: request.dataTableMatchingMode,
			dataTableMissingMode: request.dataTableMissingMode,
			dataTableSchemaConflictPolicy: request.dataTableSchemaConflictPolicy,
			variableMissingMode: request.variableMissingMode,
			// An omitted policy places variables in the project, so report what the import did.
			variableParentPolicy: request.variableParentPolicy ?? VariableParentPolicy.Project,
			tagMissingMode: request.tagMissingMode,
			tagConflictPolicy: request.tagConflictPolicy,
		},
		packageSourceId: manifest.sourceId,
		packageVersion: manifest.packageFormatVersion,
		credentialIds: {
			matched: matchedCredentialIds,
			created: createdCredentialIds,
			updated: [],
		},
		counts: {
			workflows: {
				created: countByStatus('created'),
				updated: countByStatus('updated'),
				skipped: countByStatus('skipped'),
			},
			credentials: {
				matched: matchedCredentialIds.length,
				created: createdCredentialIds.length,
				requirements: credentialRequirements,
			},
			dataTables: {
				matched: dataTablesMatched,
				created: dataTablesCreated,
				requirements: dataTableRequirements,
			},
			variables: {
				matched: variableSummary.matched.length,
				missing: variableSummary.missing.length,
				created: variablesCreated,
				requirements: variableRequirements,
			},
			tags: {
				matched: uniqueTagIds((plan) => plan.matched),
				created: uniqueTagIds((plan) => plan.creations),
				renamed: uniqueTagIds((plan) => plan.renames),
				skipped: uniqueTagIds((plan) => plan.dropped),
				requirements: tagRequirements,
			},
		},
	});
}
