import { Service } from '@n8n/di';

import { CredentialImporter } from '../entities/credential/credential.finalize';
import { DataTableImporter } from '../entities/data-table/data-table.importer';
import type { EntityImporter } from '../entities/entity-importer';
import { FolderImporter } from '../entities/folder/folder.importer';
import type { ImportPipelineOutputs, ImportScope } from '../import-export.types';
import type { EntityEntries } from '../spec/manifest.types';
import type { PackageCredentialRequirement } from '../spec/requirements.types';
import { TagImporter } from '../entities/tag/tag.importer';
import { VariableImporter } from '../entities/variable/variable.importer';
import { WorkflowImporter } from '../entities/workflow/workflow.importer';

export interface ImportPipelineOptions {
	/** When true, create empty credential stubs for unresolved credentials. */
	createCredentialStubs?: boolean;
	/** Credential requirements that were not resolved by bindings — stubs will be created for these. */
	unresolvedCredentialRequirements?: PackageCredentialRequirement[];
}

export interface ImportPipelineSeed {
	/** Initial credential bindings from BindingResolver (auto-resolve + user bindings). */
	credentialBindings?: Map<string, string>;
	/** Initial sub-workflow bindings from BindingResolver. */
	subWorkflowBindings?: Map<string, string>;
}

/**
 * Runs entity importers in dependency order:
 *
 * Phase 1 (sequential): Folders → folderIdMap
 *
 * Phase 2 (special): Credential stubs — when requested, create empty
 *   credentials for unresolved requirements; updates credentialBindings.
 *
 * Phase 3 (parallel): Workflows (consumes typed deps), Variables, DataTables.
 *
 * NOTE: No outer transaction. Wrapping at this level deadlocks SQLite —
 * repository calls inside importers acquire a separate connection from
 * the pool, but SQLite has only one. Per-importer transactions exist
 * where they make sense (e.g. credential stub creation).
 */
@Service()
export class ImportPipeline {
	private readonly parallelImporters: EntityImporter[];

	constructor(
		private readonly folderImporter: FolderImporter,
		private readonly workflowImporter: WorkflowImporter,
		private readonly tagImporter: TagImporter,
		variableImporter: VariableImporter,
		dataTableImporter: DataTableImporter,
		private readonly credentialImporter: CredentialImporter,
	) {
		this.parallelImporters = [variableImporter, dataTableImporter];
	}

	async importEntities(
		scope: ImportScope,
		entries: Partial<EntityEntries>,
		options?: ImportPipelineOptions,
		seed?: ImportPipelineSeed,
	): Promise<void> {
		// Initialise pipeline outputs from any seeded bindings.
		const outputs: ImportPipelineOutputs = {
			folderIdMap: new Map(),
			credentialBindings: new Map(seed?.credentialBindings ?? []),
			subWorkflowBindings: new Map(seed?.subWorkflowBindings ?? []),
		};

		// Phase 1a: Folders → folderIdMap
		const folderResult = await this.folderImporter.import(scope, entries.folders ?? []);
		for (const [k, v] of folderResult.folderIdMap) {
			outputs.folderIdMap.set(k, v);
		}

		// Phase 1b: Tags → tagsBySourceId (consumed by WorkflowImporter)
		const tagResult = await this.tagImporter.import(scope, entries.tags ?? []);

		// Phase 2: Finalise credentials — create stubs for unresolved
		// requirements and ensure every bound credential is shared with
		// the target project so workflows can actually use it.
		if (options) {
			outputs.credentialBindings = await this.credentialImporter.finalize(scope, {
				bindings: outputs.credentialBindings,
				unresolvedRequirements: options.unresolvedCredentialRequirements ?? [],
				createStubs: options.createCredentialStubs ?? false,
			});
		}

		// Phase 3: Parallel — workflows (with typed deps), variables, data-tables
		await Promise.all([
			this.workflowImporter.import(scope, entries.workflows ?? [], {
				folderIdMap: outputs.folderIdMap,
				credentialBindings: outputs.credentialBindings,
				subWorkflowBindings: outputs.subWorkflowBindings,
				tagsBySourceId: tagResult.tagsBySourceId,
			}),
			...this.parallelImporters.map((importer) =>
				importer.import(scope, entries[importer.entityKey] ?? []),
			),
		]);
	}
}
