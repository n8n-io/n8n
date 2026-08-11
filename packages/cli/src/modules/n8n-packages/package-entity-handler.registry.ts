import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import type {
	DataTableImportPlan,
	DataTableImportRequest,
	WorkflowDataTableRequirement,
} from './entities/data-table/data-table.types';
import type { PackageWriter } from './io/package-writer';
import type { ImportContext } from './n8n-packages.types';
import type { ManifestEntry } from './spec/manifest.schema';
import type { PackageDataTableRequirement } from './spec/requirements.schema';

export interface DataTableExportRequest {
	user: User;
	requirements: WorkflowDataTableRequirement[];
	writer: PackageWriter;
	projectTargetsById?: Map<string, string>;
}

export interface DataTableExportResult {
	entries: ManifestEntry[];
	requirements: PackageDataTableRequirement[];
}

export interface DataTablePackageHandler {
	plan(context: ImportContext, request: DataTableImportRequest): Promise<DataTableImportPlan>;
	apply(context: ImportContext, plan: DataTableImportPlan): Promise<void>;
	export(request: DataTableExportRequest): Promise<DataTableExportResult>;
}

/* eslint-disable @typescript-eslint/naming-convention -- keys are module names */
export interface PackageEntityHandlers {
	'data-table': DataTablePackageHandler;
}
/* eslint-enable @typescript-eslint/naming-convention */

/**
 * Modules owning a package entity type register their import/export handler
 * here during module init, so n8n-packages never reaches into module
 * internals. A type with no registered handler behaves exactly as if the
 * owning module were disabled.
 */
@Service()
export class PackageEntityHandlerRegistry {
	private readonly handlers = new Map<
		keyof PackageEntityHandlers,
		PackageEntityHandlers[keyof PackageEntityHandlers]
	>();

	register<T extends keyof PackageEntityHandlers>(
		entityType: T,
		handler: PackageEntityHandlers[T],
	) {
		this.handlers.set(entityType, handler);
	}

	get<T extends keyof PackageEntityHandlers>(entityType: T): PackageEntityHandlers[T] | undefined {
		return this.handlers.get(entityType);
	}
}
