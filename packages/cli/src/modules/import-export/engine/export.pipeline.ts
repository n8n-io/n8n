import { Service } from '@n8n/di';

import { CredentialExporter } from '../entities/credential/credential.exporter';
import { DataTableExporter } from '../entities/data-table/data-table.exporter';
import type { EntityExporter } from '../entities/entity-exporter';
import { FolderExporter } from '../entities/folder/folder.exporter';
import { type ExportScope } from '../import-export.types';
import { ENTITY_KEYS, type EntityEntries, type EntityKey } from '../spec/manifest.types';
import type { PackageRequirements } from '../spec/requirements.types';
import { TagExporter } from '../entities/tag/tag.exporter';
import { VariableExporter } from '../entities/variable/variable.exporter';
import { WorkflowExporter } from '../entities/workflow/workflow.exporter';

import { PackageRequirementsExtractor } from './requirements-extractor';

export interface ExportPipelineResult extends EntityEntries {
	requirements: PackageRequirements;
}

const emptyEntries = (): EntityEntries =>
	ENTITY_KEYS.reduce((acc, key) => {
		acc[key] = [];
		return acc;
	}, {} as EntityEntries);

/**
 * Runs entity exporters in dependency order:
 *
 * Phase 1 (sequential, typed deps):
 *   FolderExporter   → folderPathMap
 *   WorkflowExporter(folderPathMap) → nodesByWorkflow
 *
 * Phase 2 (parallel, independent): credentials, variables, data-tables
 *
 * Phase 3 (post-process): requirements extraction from nodesByWorkflow
 *
 * Phase 4 (backfill): for non-project exports, fetch credentials/variables
 *   referenced by workflows but not picked up by entity exporters.
 */
@Service()
export class ExportPipeline {
	private readonly parallelExporters: EntityExporter[];

	constructor(
		private readonly folderExporter: FolderExporter,
		private readonly workflowExporter: WorkflowExporter,
		private readonly tagExporter: TagExporter,
		credentialExporter: CredentialExporter,
		variableExporter: VariableExporter,
		dataTableExporter: DataTableExporter,
		private readonly requirementsExtractor: PackageRequirementsExtractor,
	) {
		this.parallelExporters = [credentialExporter, variableExporter, dataTableExporter];
	}

	async run(scope: ExportScope): Promise<ExportPipelineResult> {
		const entries = emptyEntries();

		// Phase 1: Sequential — typed dependencies, no shared mutable state.
		const folderResult = await this.folderExporter.export(scope);
		entries.folders = folderResult.entries;

		const workflowResult = await this.workflowExporter.export(scope, {
			folderPathMap: folderResult.folderPathMap,
		});
		entries.workflows = workflowResult.entries;

		// Tags depend on workflows (we only export tags actually referenced).
		entries.tags = await this.tagExporter.export(scope, {
			referencedTags: workflowResult.referencedTags,
		});

		// Phase 2: Parallel — independent entities.
		await Promise.all(
			this.parallelExporters.map(async (exporter) => {
				entries[exporter.entityKey as EntityKey] = await exporter.export(scope);
			}),
		);

		// Phase 3: Requirements extraction.
		const workflowIds = new Set(entries.workflows.map((w) => w.id));
		const requirements = this.requirementsExtractor.extract(workflowResult.nodesByWorkflow, {
			credentialIds: new Set(),
			workflowIds,
		});

		// Phase 4: Backfill — entity exporters that opt in via `backfill()`
		// can include extra entries referenced by workflows (e.g. credentials
		// referenced from a non-project-scoped workflow export).
		await this.backfillFromRequirements(scope, entries, requirements);

		return { ...entries, requirements };
	}

	private async backfillFromRequirements(
		scope: ExportScope,
		entries: EntityEntries,
		requirements: PackageRequirements,
	): Promise<void> {
		for (const exporter of this.parallelExporters) {
			if (!exporter.backfill) continue;
			const key = exporter.entityKey as EntityKey;
			const extra = await exporter.backfill(requirements, entries[key], scope);
			if (extra.length > 0) {
				entries[key] = [...entries[key], ...extra];
			}
		}
	}
}
