import { Service } from '@n8n/di';

import { CredentialImporter } from './credential/credential.importer';
import { DataTableImporter } from './data-table/data-table.importer';
import type { EntityImporter } from './entity-importer';
import { FolderImporter } from './folder/folder.importer';
import type {
	EntityEntries,
	ImportPipelineState,
	ImportScope,
	PackageCredentialRequirement,
} from './import-export.types';
import { VariableImporter } from './variable/variable.importer';
import { WorkflowImporter } from './workflow/workflow.importer';

export interface ImportPipelineOptions {
	/** When true, create empty credential stubs for unresolved credentials. */
	createCredentialStubs?: boolean;
	/** Credential requirements that were not resolved by bindings — stubs will be created for these. */
	unresolvedCredentialRequirements?: PackageCredentialRequirement[];
}

/**
 * Runs entity importers in dependency order:
 *
 * Phase 1 (sequential): Folders — produces `folderIdMap` on scope.state.
 *
 * Phase 2 (special): Credential stubs — when requested, creates empty
 *   credentials for unresolved requirements and adds them to
 *   scope.state.credentialBindings.
 *
 * Phase 3 (parallel): Workflows, Variables, DataTables — independent,
 *   read shared state from scope.state.
 *
 * NOTE: No outer transaction wrapper. Downstream code (e.g.
 * ImportService.importWorkflows, CredentialImporter.createStub) manages
 * its own transactions. Wrapping at this level would deadlock on SQLite
 * because repository calls inside importers acquire a separate connection
 * from the pool, but SQLite only has one.
 */
@Service()
export class ImportPipeline {
	/** Phase 1: Run sequentially — each writes to scope.state for the next */
	private readonly sequentialImporters: EntityImporter[];

	/** Phase 3: Run concurrently — independent of each other */
	private readonly parallelImporters: EntityImporter[];

	constructor(
		folderImporter: FolderImporter,
		workflowImporter: WorkflowImporter,
		variableImporter: VariableImporter,
		dataTableImporter: DataTableImporter,
		private readonly credentialImporter: CredentialImporter,
	) {
		this.sequentialImporters = [folderImporter];
		this.parallelImporters = [workflowImporter, variableImporter, dataTableImporter];
	}

	async importEntities(
		scope: ImportScope,
		entries: Partial<EntityEntries>,
		options?: ImportPipelineOptions,
	): Promise<void> {
		// Phase 1: Sequential importers — folders produce folderIdMap
		for (const importer of this.sequentialImporters) {
			await importer.import(scope, entries[importer.entityKey] ?? []);
		}

		// Phase 2: Credential stubs — create empty credentials for unresolved requirements
		if (options?.createCredentialStubs && options.unresolvedCredentialRequirements?.length) {
			const updatedBindings = await this.credentialImporter.createStubsFromRequirements(
				scope,
				options.unresolvedCredentialRequirements,
				scope.state.credentialBindings,
			);
			scope.state.credentialBindings = updatedBindings;
		}

		// Phase 3: Parallel importers — workflows, variables, data-tables
		await Promise.all(
			this.parallelImporters.map((importer) =>
				importer.import(scope, entries[importer.entityKey] ?? []),
			),
		);
	}

	static createPipelineState(
		credentialBindings?: Map<string, string>,
		subWorkflowBindings?: Map<string, string>,
	): ImportPipelineState {
		return {
			folderIdMap: new Map(),
			credentialBindings: new Map(credentialBindings ?? []),
			subWorkflowBindings: new Map(subWorkflowBindings ?? []),
		};
	}
}
