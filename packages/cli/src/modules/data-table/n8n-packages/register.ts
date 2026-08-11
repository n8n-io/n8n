import { Container } from '@n8n/di';

import { PackageEntityHandlerRegistry } from '@/modules/n8n-packages/package-entity-handler.registry';

import { DataTableImporter } from './data-table-importer';
import { DataTableExporter } from './data-table.exporter';

/**
 * Hooks this module into n8n-packages import/export. Runs on module init, so
 * n8n-packages sees no handler — and reports data tables as unavailable —
 * exactly when this module is disabled.
 */
export function registerDataTablePackageHandler() {
	const importer = Container.get(DataTableImporter);
	const exporter = Container.get(DataTableExporter);

	Container.get(PackageEntityHandlerRegistry).register('data-table', {
		plan: async (context, request) => await importer.plan(context, request),
		apply: async (context, plan) => await importer.apply(context, plan),
		export: async (request) => await exporter.export(request),
	});
}
