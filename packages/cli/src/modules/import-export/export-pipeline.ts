import { Service } from '@n8n/di';

import { CredentialExporter } from './credential/credential.exporter';
import { DataTableExporter } from './data-table/data-table.exporter';
import type { EntityExporter } from './entity-exporter';
import { FolderExporter } from './folder/folder.exporter';
import type {
	EntityEntries,
	ExportScope,
	ManifestEntry,
	PackageRequirements,
} from './import-export.types';
import { PackageRequirementsExtractor } from './package-requirements-extractor';
import { VariableExporter } from './variable/variable.exporter';
import { WorkflowExporter } from './workflow/workflow.exporter';

export interface ExportPipelineResult extends EntityEntries {
	requirements: PackageRequirements;
}

/**
 * Runs entity exporters in dependency order:
 *
 * Phase 1 (sequential): Folder → Workflow — order matters because
 *   folders produce `folderPathMap` consumed by workflows, and
 *   workflows produce `nodesByWorkflow` consumed by requirements.
 *
 * Phase 2 (parallel): Credentials, Variables, DataTables — independent.
 *
 * Phase 3 (post-process): Extract requirements, backfill referenced
 *   credentials/variables for non-project exports.
 */
@Service()
export class ExportPipeline {
	/** Phase 1: Run sequentially — each writes to scope.state for the next */
	private readonly sequentialExporters: EntityExporter[];

	/** Phase 2: Run concurrently — independent of each other */
	private readonly parallelExporters: EntityExporter[];

	constructor(
		folderExporter: FolderExporter,
		workflowExporter: WorkflowExporter,
		private readonly credentialExporter: CredentialExporter,
		private readonly variableExporter: VariableExporter,
		dataTableExporter: DataTableExporter,
		private readonly requirementsExtractor: PackageRequirementsExtractor,
	) {
		this.sequentialExporters = [folderExporter, workflowExporter];
		this.parallelExporters = [credentialExporter, variableExporter, dataTableExporter];
	}

	async run(scope: ExportScope): Promise<ExportPipelineResult> {
		const entries: Record<string, ManifestEntry[]> = {};

		// Phase 1: Sequential — order matters (folders → workflows)
		for (const exporter of this.sequentialExporters) {
			entries[exporter.entityKey] = await exporter.export(scope);
		}

		// Phase 2: Parallel — independent entities
		await Promise.all(
			this.parallelExporters.map(async (exporter) => {
				entries[exporter.entityKey] = await exporter.export(scope);
			}),
		);

		// Phase 3: Requirements extraction
		const workflowIds = new Set((entries.workflows ?? []).map((w) => w.id));
		const requirements = this.requirementsExtractor.extract(scope.state.nodesByWorkflow, {
			credentialIds: new Set(),
			workflowIds,
		});

		// Phase 4: Backfill — for non-project exports, credentials and variables
		// aren't fetched by the entity exporters (no projectId on scope).
		// Use the extracted requirements to fetch and include them.
		await this.backfillFromRequirements(scope, entries, requirements);

		return {
			folders: entries.folders ?? [],
			workflows: entries.workflows ?? [],
			credentials: entries.credentials ?? [],
			variables: entries.variables ?? [],
			dataTables: entries.dataTables ?? [],
			requirements,
		};
	}

	private async backfillFromRequirements(
		scope: ExportScope,
		entries: Record<string, ManifestEntry[]>,
		requirements: PackageRequirements,
	): Promise<void> {
		if ((entries.credentials?.length ?? 0) === 0 && requirements.credentials.length > 0) {
			const referencedIds = requirements.credentials.map((r) => r.id);
			entries.credentials = await this.credentialExporter.exportByIds(referencedIds, scope);
		}

		if ((entries.variables?.length ?? 0) === 0 && requirements.variables.length > 0) {
			const referencedNames = requirements.variables.map((r) => r.name);
			entries.variables = await this.variableExporter.exportByNames(referencedNames, scope);
		}
	}
}
