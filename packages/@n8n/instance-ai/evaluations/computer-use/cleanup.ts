// ---------------------------------------------------------------------------
// Snapshot + diff cleanup for n8n state created during a scenario.
//
// Strategy: list all resources before the run, list again after, delete the
// delta. Robust to whatever path the agent took, doesn't depend on parsing
// every tool-call result correctly. Mirrors `cleanupBuild` in the workflow
// eval but generalised across resource types.
// ---------------------------------------------------------------------------

import type { N8nClient } from '../clients/n8n-client';
import type { EvalLogger } from '../harness/logger';

export interface ResourceSnapshot {
	workflowIds: Set<string>;
	credentialIds: Set<string>;
	dataTableIds: Set<string>;
	projectId: string;
}

/** Snapshot the IDs of all resource types we know how to clean up. */
export async function snapshotResources(client: N8nClient): Promise<ResourceSnapshot> {
	const projectId = await client.getPersonalProjectId();
	const [workflowIds, credentialIds, dataTableIds] = await Promise.all([
		client.listWorkflowIds(),
		client.listCredentialIds(),
		client.listDataTableIds(projectId),
	]);

	return {
		workflowIds: new Set(workflowIds),
		credentialIds: new Set(credentialIds),
		dataTableIds: new Set(dataTableIds),
		projectId,
	};
}

/**
 * Delete every resource that exists now but didn't exist in the snapshot.
 * Best-effort: failures are logged at verbose and not rethrown.
 *
 * Order: workflows → credentials → data tables. Workflows reference
 * credentials and data tables, so they have to go first.
 */
export async function cleanupDelta(
	client: N8nClient,
	before: ResourceSnapshot,
	logger: EvalLogger,
): Promise<{ deletedWorkflows: number; deletedCredentials: number; deletedDataTables: number }> {
	const counts = { deletedWorkflows: 0, deletedCredentials: 0, deletedDataTables: 0 };

	const [workflowsAfter, credentialsAfter, dataTablesAfter] = await Promise.all([
		client.listWorkflowIds().catch((): string[] => []),
		client.listCredentialIds().catch((): string[] => []),
		client.listDataTableIds(before.projectId).catch((): string[] => []),
	]);

	for (const id of workflowsAfter) {
		if (before.workflowIds.has(id)) continue;
		try {
			await client.deleteWorkflow(id);
			counts.deletedWorkflows += 1;
		} catch (error) {
			logger.verbose(`[cleanup] failed to delete workflow ${id}: ${describeError(error)}`);
		}
	}

	for (const id of credentialsAfter) {
		if (before.credentialIds.has(id)) continue;
		try {
			await client.deleteCredential(id);
			counts.deletedCredentials += 1;
		} catch (error) {
			logger.verbose(`[cleanup] failed to delete credential ${id}: ${describeError(error)}`);
		}
	}

	for (const id of dataTablesAfter) {
		if (before.dataTableIds.has(id)) continue;
		try {
			await client.deleteDataTable(before.projectId, id);
			counts.deletedDataTables += 1;
		} catch (error) {
			logger.verbose(`[cleanup] failed to delete data table ${id}: ${describeError(error)}`);
		}
	}

	if (counts.deletedWorkflows + counts.deletedCredentials + counts.deletedDataTables > 0) {
		logger.verbose(
			`[cleanup] deleted ${String(counts.deletedWorkflows)} workflow(s), ${String(counts.deletedCredentials)} credential(s), ${String(counts.deletedDataTables)} data table(s)`,
		);
	}

	return counts;
}

function describeError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
