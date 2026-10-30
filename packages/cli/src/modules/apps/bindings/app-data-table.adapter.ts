import type {
	AppDataTableBinding,
	AppDescribedDataTableBinding,
	AppJsonSchema,
	AppRuntimeRowInput,
	DataTableFilter,
	ListDataTableContentQueryDto,
} from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
import {
	AppDataTablePort,
	AppRuntimeError,
	type AppCallContext,
	type AppRow,
} from '@n8n/backend-module-apps';
import type { User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { BadRequestError, NotFoundError } from '@n8n/errors';
import type { Scope } from '@n8n/permissions';
import type { DataTableColumnType } from 'n8n-workflow';

/** Lazy, so the data-table module loads only when it is active. */
async function dataTableModule() {
	const [{ DataTableService }, { DataTableNotFoundError }, { DataTableValidationError }] =
		await Promise.all([
			import('@/modules/data-table/data-table.service.js'),
			import('@/modules/data-table/errors/data-table-not-found.error.js'),
			import('@/modules/data-table/errors/data-table-validation.error.js'),
		]);
	return {
		service: Container.get(DataTableService),
		DataTableNotFoundError,
		DataTableValidationError,
	};
}

type DataTableModule = Awaited<ReturnType<typeof dataTableModule>>;

/** Dates leave the API as ISO strings. Every user column can hold `null`. */
function columnSchema(type: DataTableColumnType): AppJsonSchema {
	if (type === 'date') return { type: ['string', 'null'], format: 'date-time' };
	return { type: [type, 'null'] };
}

function rowSchema(columns: Array<{ name: string; type: DataTableColumnType }>): AppJsonSchema {
	const properties: Record<string, AppJsonSchema> = {
		id: { type: 'number' },
		createdAt: { type: 'string', format: 'date-time' },
		updatedAt: { type: 'string', format: 'date-time' },
		...Object.fromEntries(columns.map(({ name, type }) => [name, columnSchema(type)])),
	};
	return {
		type: 'object',
		properties,
		required: Object.keys(properties),
		additionalProperties: false,
	};
}

/** Data table access for app bindings. Every call acts as the app project. */
@Service()
export class AppDataTableAdapter extends AppDataTablePort {
	constructor(private readonly moduleRegistry: ModuleRegistry) {
		super();
	}

	async assertCanBind(user: User, projectId: string, binding: AppDataTableBinding) {
		if (!this.moduleRegistry.isActive('data-table')) {
			throw new BadRequestError('Data tables are not enabled on this instance.');
		}
		const { service } = await dataTableModule();
		const writes = binding.permissions.some((permission) => permission !== 'read');
		const scopes: Scope[] = writes
			? ['dataTable:readRow', 'dataTable:writeRow']
			: ['dataTable:readRow'];
		const [table] = await service.findDataTablesByIdsForUser([binding.dataTableId], user, scopes);
		if (!table) {
			throw new NotFoundError(
				`Binding "${binding.key}": you cannot use data table "${binding.dataTableId}" with these permissions.`,
			);
		}
		if (table.projectId !== projectId) {
			throw new BadRequestError(
				`Binding "${binding.key}": data table "${table.name}" must be in the app project.`,
			);
		}
	}

	async describe(
		projectId: string,
		binding: AppDataTableBinding,
	): Promise<AppDescribedDataTableBinding | null> {
		if (!this.moduleRegistry.isActive('data-table')) return null;
		const { service, DataTableNotFoundError } = await dataTableModule();
		try {
			const table = await service.validateDataTableExists(binding.dataTableId, projectId);
			const columns = (await service.getColumns(binding.dataTableId, projectId)).map(
				({ name, type }) => ({ name, type }),
			);
			return { ...binding, name: table.name, columns, row: rowSchema(columns) };
		} catch (error) {
			if (error instanceof DataTableNotFoundError) return null;
			throw error;
		}
	}

	async listRows(ctx: AppCallContext, dataTableId: string, query: ListDataTableContentQueryDto) {
		return await this.call(
			async (service) => await service.getManyRowsAndCount(dataTableId, ctx.projectId, query),
		);
	}

	async insertRows(
		ctx: AppCallContext,
		dataTableId: string,
		rows: AppRuntimeRowInput[],
	): Promise<AppRow[]> {
		return await this.call(
			async (service) => await service.insertRows(dataTableId, ctx.projectId, rows, 'all'),
		);
	}

	async updateRows(
		ctx: AppCallContext,
		dataTableId: string,
		filter: DataTableFilter,
		data: AppRuntimeRowInput,
	): Promise<AppRow[]> {
		return await this.call(
			async (service) =>
				await service.updateRows(dataTableId, ctx.projectId, { filter, data }, true, false),
		);
	}

	async deleteRows(
		ctx: AppCallContext,
		dataTableId: string,
		filter: DataTableFilter,
	): Promise<AppRow[]> {
		return await this.call(
			async (service) =>
				await service.deleteRows(dataTableId, ctx.projectId, { filter }, true, false),
		);
	}

	/**
	 * Runs a row operation for an app visitor. The table can leave the project
	 * between two calls. A value that the columns reject is the caller's error.
	 */
	private async call<T>(operation: (service: DataTableModule['service']) => Promise<T>) {
		if (!this.moduleRegistry.isActive('data-table')) {
			throw new AppRuntimeError(404, 'resource_missing', 'Data tables are not enabled.');
		}
		const { service, DataTableNotFoundError, DataTableValidationError } = await dataTableModule();
		try {
			return await operation(service);
		} catch (error) {
			if (error instanceof DataTableValidationError) {
				throw new AppRuntimeError(400, 'invalid_input', error.message);
			}
			if (error instanceof DataTableNotFoundError) {
				throw new AppRuntimeError(
					404,
					'resource_missing',
					'The bound data table is no longer in the app project.',
				);
			}
			throw error;
		}
	}
}
