import type { EventService } from '@/events/event.service';

import type { CredentialBindingRequest } from '../entities/credential/credential.types';
import type { DataTableImportRequest } from '../entities/data-table/data-table.types';
import type { VariableImportRequest } from '../entities/variable/variable.types';
import type { WorkflowImportOutcome } from '../entities/workflow/workflow-import.types';
import type { ImportContext, ImportPackageRequest } from '../n8n-packages.types';
import type { ImportOrchestrationResult } from './import-orchestrator';
import type { PackageManifest } from '../spec/manifest.schema';

export interface PackageImportScope {
	context: ImportContext;
	imported: ImportOrchestrationResult;
	credentialRequest: CredentialBindingRequest;
	dataTableRequest: DataTableImportRequest;
	variableRequest: VariableImportRequest;
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
	const countByStatus = (status: WorkflowImportOutcome['status']) =>
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

	const variablePlans = scopes.map(({ imported }) => imported.variablePlan);
	const variableRequirements = scopes.reduce(
		(total, { variableRequest }) => total + (variableRequest.requirements?.length ?? 0),
		0,
	);
	const variablesMatched = variablePlans.reduce((total, plan) => total + plan.matched.length, 0);
	const variablesMissing = variablePlans.reduce((total, plan) => total + plan.missing.length, 0);

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
				matched: variablesMatched,
				missing: variablesMissing,
				requirements: variableRequirements,
			},
		},
	});
}
