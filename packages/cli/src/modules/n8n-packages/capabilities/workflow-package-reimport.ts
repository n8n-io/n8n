import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { CredentialsFinderService } from '@n8n/backend-services';
import type { User, WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import type { INode } from 'n8n-workflow';

import { CredentialsService } from '@/credentials/credentials.service';
import { DataTableService } from '@/modules/data-table/data-table.service';
import { createWorkflowEntityFromPayload } from '@/workflows/workflow-entity-mapper';
import { WorkflowService } from '@/workflows/workflow.service';

import {
	acceptedCredentialChoices,
	credentialChoicesOfCopy,
	type DataTableChoices,
	dataTableChoicesOfCopy,
	hasNoCredentialValue,
	type UsableCredential,
	withDataTableSelections,
} from './copy-choices';
import { dataTablesNotKeptWarning, keptDataTablesWarning } from './import-outcome';
import { reasonForClient } from './package-tool-error';
import { logPostImportFailure } from './post-import-step';
import type {
	PackageDataTableRequirement,
	PackageRequirements,
} from '../spec/requirements.schema';

/** What a re-import keeps of the copy that it updates. */
export type ReimportPlan = {
	/** Source credential id → the credential that the copy uses. The import binds these. */
	credentialBindings: Map<string, string>;
	conflictingCredentialSourceIds: string[];
	dataTables: DataTableChoices;
};

export const NEW_COPY_PLAN: ReimportPlan = {
	credentialBindings: new Map(),
	conflictingCredentialSourceIds: [],
	dataTables: { selections: new Map(), replacedTables: [] },
};

export type ReimportPlanInput = {
	user: User;
	projectId: string;
	/** The nodes of the workflow in the package. */
	packageNodes: readonly INode[];
	/** The nodes of the copy before the re-import. */
	copyNodes: readonly INode[];
	requirements: PackageRequirements | undefined;
};

async function usableCredentials(user: User, projectId: string): Promise<UsableCredential[]> {
	const credentials = await Container.get(CredentialsService).getCredentialsAUserCanUseInAWorkflow(
		user,
		{ projectId },
	);
	return credentials.map(({ id, type }) => ({ id, type }));
}

/** The data tables of the package that the target project does not have. */
async function missingDataTables(
	projectId: string,
	required: readonly PackageDataTableRequirement[],
): Promise<PackageDataTableRequirement[]> {
	// The import reports a package with data tables while the module is off.
	if (required.length === 0 || !Container.get(ModuleRegistry).isActive('data-table')) return [];
	const found = await Container.get(DataTableService).findDataTablesByIds(
		required.map(({ id }) => id),
	);
	const inProject = new Set(found.filter((t) => t.projectId === projectId).map(({ id }) => id));
	return required.filter(({ id }) => !inProject.has(id));
}

/**
 * Plans what a re-import keeps of the copy: the credentials and data tables that the user chose
 * for the copy on this instance. Without the plan, a re-import binds the references of the
 * package again and can put a version live that uses an empty credential or a missing table.
 */
export async function planReimport(input: ReimportPlanInput): Promise<ReimportPlan> {
	const { user, projectId, packageNodes, copyNodes, requirements } = input;
	const credentials = credentialChoicesOfCopy(packageNodes, copyNodes);
	const credentialBindings =
		credentials.bindings.size === 0
			? credentials.bindings
			: acceptedCredentialChoices(
					credentials.bindings,
					requirements?.credentials ?? [],
					await usableCredentials(user, projectId),
				);
	const missingTables = await missingDataTables(projectId, requirements?.dataTables ?? []);
	return {
		credentialBindings,
		conflictingCredentialSourceIds: credentials.conflicting,
		dataTables: dataTableChoicesOfCopy(packageNodes, copyNodes, missingTables),
	};
}

async function holdsNoValue(user: User, credentialId: string): Promise<boolean> {
	const credential = await Container.get(CredentialsFinderService).findCredentialForUser(
		credentialId,
		user,
		['credential:read'],
	);
	if (credential === null) return false;
	// Only whether a value exists leaves this function, never the value.
	return hasNoCredentialValue(await Container.get(CredentialsService).decrypt(credential, true));
}

/**
 * The credentials among `credentialIds` that hold no value, for example a stub of an earlier
 * import. A credential that the user cannot read, or that cannot be checked, is left out. It runs
 * after the import wrote the workflow, so a failure goes to the log only.
 */
export async function credentialsWithoutValue(
	user: User,
	credentialIds: readonly string[],
): Promise<Set<string>> {
	const empty = new Set<string>();
	for (const credentialId of new Set(credentialIds)) {
		try {
			if (await holdsNoValue(user, credentialId)) empty.add(credentialId);
		} catch (error) {
			Container.get(Logger).warn('Could not check whether a credential holds a value', {
				credentialId,
				error: ensureError(error).message,
			});
		}
	}
	return empty;
}

export type KeptDataTables = {
	/** The copy after the step, or undefined when the step wrote nothing. */
	copy: WorkflowEntity | undefined;
	warnings: string[];
};

/**
 * Puts the data table selections of the copy back into the nodes that the import wrote. When
 * the import put its version live, the version with the selections goes live too, so that the
 * live version uses the tables of this project.
 */
export async function keepDataTableSelections(
	user: User,
	copy: WorkflowEntity,
	choices: DataTableChoices,
): Promise<KeptDataTables> {
	const { replacedTables } = choices;
	if (replacedTables.length === 0) return { copy: undefined, warnings: [] };
	const nodes = withDataTableSelections(copy.nodes, choices.selections);
	if (nodes === undefined) return { copy: undefined, warnings: [keptDataTablesWarning(replacedTables)] };
	try {
		const updated = await Container.get(WorkflowService).update(
			user,
			createWorkflowEntityFromPayload({ nodes }),
			copy.id,
			{ source: 'import', publishIfActive: copy.activeVersionId === copy.versionId },
		);
		return { copy: updated, warnings: [keptDataTablesWarning(replacedTables)] };
	} catch (error) {
		logPostImportFailure(copy.id, error);
		return {
			copy: undefined,
			warnings: [dataTablesNotKeptWarning(replacedTables, reasonForClient(error))],
		};
	}
}
