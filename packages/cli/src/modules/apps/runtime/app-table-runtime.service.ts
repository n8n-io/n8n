import {
	AddDataTableRowsDto,
	DeleteDataTableRowsDto,
	ListDataTableContentQueryDto,
	UpdateDataTableRowDto,
	type AppBinding,
	type DataTablePermission,
} from '@n8n/api-types';
import { Service } from '@n8n/di';
import { z } from 'zod';

import { DataTableService } from '@/modules/data-table/data-table.service';
import { DataTableNotFoundError } from '@/modules/data-table/errors/data-table-not-found.error';
import { DataTableValidationError } from '@/modules/data-table/errors/data-table-validation.error';

import { AppRepository } from '../app.repository';
import { AppRuntimeError } from './app-runtime.error';

/** One request inserts at most this many rows; the body cap alone would allow far more tiny rows. */
const MAX_INSERT_ROWS = 100;

const insertRowsSchema = z.object({
	data: AddDataTableRowsDto.schema.shape.data.max(MAX_INSERT_ROWS),
});

type DataTableBinding = Extract<AppBinding, { kind: 'dataTable' }>;

/** The table the runtime may touch on behalf of `namespace`: its id and the app's project. */
interface BoundTable {
	dataTableId: string;
	projectId: string;
}

/**
 * Rows of the data tables bound to an app, read and written as the app's project. Every
 * refusal has its own code, and the payloads are the REST DTOs, so the SDK and the REST
 * API agree on filters, sorting and paging.
 */
@Service()
export class AppTableRuntimeService {
	constructor(
		private readonly appRepository: AppRepository,
		private readonly dataTableService: DataTableService,
	) {}

	async listRows(namespace: string, key: string, query: unknown) {
		const { dataTableId, projectId } = await this.resolve(namespace, key, 'read');
		const dto = parseInput(ListDataTableContentQueryDto.safeParse(query));
		return await mapDataTableErrors(
			async () => await this.dataTableService.getManyRowsAndCount(dataTableId, projectId, dto),
		);
	}

	async insertRows(namespace: string, key: string, body: unknown) {
		const { dataTableId, projectId } = await this.resolve(namespace, key, 'write');
		const { data } = parseInput(insertRowsSchema.safeParse(body));
		const rows = await mapDataTableErrors(
			async () => await this.dataTableService.insertRows(dataTableId, projectId, data, 'all'),
		);
		return { data: rows };
	}

	async updateRows(namespace: string, key: string, body: unknown) {
		const { dataTableId, projectId } = await this.resolve(namespace, key, 'write');
		const { filter, data } = parseInput(UpdateDataTableRowDto.safeParse(body));
		const rows = await mapDataTableErrors(
			async () =>
				await this.dataTableService.updateRows(
					dataTableId,
					projectId,
					{ filter, data },
					true,
					false,
				),
		);
		return { data: rows };
	}

	async deleteRows(namespace: string, key: string, query: unknown) {
		const { dataTableId, projectId } = await this.resolve(namespace, key, 'write');
		const { filter } = parseInput(DeleteDataTableRowsDto.safeParse(query));
		const rows = await mapDataTableErrors(
			async () =>
				await this.dataTableService.deleteRows(dataTableId, projectId, { filter }, true, false),
		);
		return { data: rows };
	}

	/**
	 * Only `namespace` and `key` come from the caller: the table id is the stored binding's,
	 * and the table must still belong to the app's project, which is the identity the
	 * call runs as.
	 */
	private async resolve(
		namespace: string,
		key: string,
		needed: DataTablePermission,
	): Promise<BoundTable> {
		const app = await this.appRepository.findByNamespace(namespace);
		if (!app) {
			throw new AppRuntimeError(404, 'app_not_found', `No app is served at /apps/${namespace}.`);
		}

		const binding = app.bindings.find(
			(b): b is DataTableBinding => b.key === key && b.kind === 'dataTable',
		);
		if (!binding) {
			throw new AppRuntimeError(
				404,
				'binding_not_found',
				`App "${app.namespace}" has no data table bound as "${key}".`,
			);
		}

		if (!binding.permissions.includes(needed)) {
			throw new AppRuntimeError(
				403,
				'permission_denied',
				`The binding "${key}" does not allow ${needed} access to its data table.`,
			);
		}

		await mapDataTableErrors(
			async () =>
				await this.dataTableService.validateDataTableExists(binding.dataTableId, app.projectId),
		);

		return { dataTableId: binding.dataTableId, projectId: app.projectId };
	}
}

function parseInput<T>(parsed: z.SafeParseReturnType<unknown, T>): T {
	if (parsed.success) return parsed.data;
	throw new AppRuntimeError(
		400,
		'invalid_input',
		'The request does not match the data table API.',
		parsed.error.issues.map(({ path, code }) => ({ path: path.map(String), code })),
	);
}

/** The table can vanish between `resolve` and the row call; a filter or value the columns reject is the caller's. */
async function mapDataTableErrors<T>(call: () => Promise<T>): Promise<T> {
	try {
		return await call();
	} catch (error) {
		if (error instanceof DataTableValidationError) {
			throw new AppRuntimeError(400, 'invalid_input', error.message);
		}
		if (error instanceof DataTableNotFoundError) {
			throw new AppRuntimeError(
				404,
				'table_not_found',
				'The bound data table no longer exists in the app’s project.',
			);
		}
		throw error;
	}
}
