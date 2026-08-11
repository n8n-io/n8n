import type { SourceControlledFile } from '@n8n/api-types';
import { Service } from '@n8n/di';

import type { ExportResult } from './types/export-result';
import type {
	DataTableResourceOwner,
	ExportableDataTable,
	StatusExportableDataTable,
} from './types/exportable-data-table';
import type { SourceControlContext } from './types/source-control-context';

/**
 * Source control operations for data tables, implemented by the data-table
 * module so source control does not depend on data-table internals.
 */
export interface SourceControlDataTableHandler {
	exportDataTablesToWorkFolder(
		candidates: SourceControlledFile[],
		context: SourceControlContext,
	): Promise<ExportResult>;

	getRemoteDataTablesFromFiles(context: SourceControlContext): Promise<ExportableDataTable[]>;

	getLocalDataTablesFromDb(context: SourceControlContext): Promise<StatusExportableDataTable[]>;

	/**
	 * Resolves the local project a remote data table belongs to. The status
	 * service uses this for collision detection so the pull preview matches
	 * where the import will place the table.
	 */
	resolveRemoteDataTableProjectId(
		ownedBy: DataTableResourceOwner | null,
		pullingUserId: string,
	): Promise<string>;

	importDataTablesFromWorkFolder(
		candidates: SourceControlledFile[],
		userId: string,
	): Promise<
		{ imported: string[]; reconciliationFailures: Array<{ id: string; name: string }> } | undefined
	>;

	deleteDataTablesNotInWorkFolder(candidates: SourceControlledFile[]): Promise<void>;
}

/**
 * Modules register their source-controlled resource handlers here during
 * `init()`. A missing handler means the owning module is not active, and
 * source control skips that resource type.
 */
@Service()
export class SourceControlResourceHandlerRegistry {
	private dataTableHandler?: SourceControlDataTableHandler;

	registerDataTableHandler(handler: SourceControlDataTableHandler) {
		this.dataTableHandler = handler;
	}

	getDataTableHandler(): SourceControlDataTableHandler | undefined {
		return this.dataTableHandler;
	}
}
