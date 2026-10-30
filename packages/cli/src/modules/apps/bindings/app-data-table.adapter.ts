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
import { Service } from '@n8n/di';
import { BadRequestError, NotFoundError } from '@n8n/errors';
import type { Scope } from '@n8n/permissions';
import type { DataTableColumnType } from 'n8n-workflow';

import { DataTableService } from '@/modules/data-table/data-table.service';
import { DataTableNotFoundError } from '@/modules/data-table/errors/data-table-not-found.error';
import { DataTableValidationError } from '@/modules/data-table/errors/data-table-validation.error';

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
	constructor(
		private readonly dataTableService: DataTableService,
		private readonly moduleRegistry: ModuleRegistry,
	) {
		super();
	}

	async assertCanBind(user: User, projectId: string, binding: AppDataTableBinding) {
		this.assertEnabled();
		const writes = binding.permissions.some((permission) => permission !== 'read');
		const scopes: Scope[] = writes
			? ['dataTable:readRow', 'dataTable:writeRow']
			: ['dataTable:readRow'];
		const [table] = await this.dataTableService.findDataTablesByIdsForUser(
			[binding.dataTableId],
			user,
			scopes,
		);
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
		try {
			const table = await this.dataTableService.validateDataTableExists(
				binding.dataTableId,
				projectId,
			);
			const columns = (await this.dataTableService.getColumns(binding.dataTableId, projectId)).map(
				({ name, type }) => ({ name, type }),
			);
			return { ...binding, name: table.name, columns, row: rowSchema(columns) };
		} catch (error) {
			if (error instanceof DataTableNotFoundError) return null;
			throw error;
		}
	}

	async listRows(ctx: AppCallContext, dataTableId: string, query: ListDataTableContentQueryDto) {
		this.assertEnabledAtRuntime();
		return await mapErrors(
			async () =>
				await this.dataTableService.getManyRowsAndCount(dataTableId, ctx.projectId, query),
		);
	}

	async insertRows(
		ctx: AppCallContext,
		dataTableId: string,
		rows: AppRuntimeRowInput[],
	): Promise<AppRow[]> {
		this.assertEnabledAtRuntime();
		return await mapErrors(
			async () => await this.dataTableService.insertRows(dataTableId, ctx.projectId, rows, 'all'),
		);
	}

	async updateRows(
		ctx: AppCallContext,
		dataTableId: string,
		filter: DataTableFilter,
		data: AppRuntimeRowInput,
	): Promise<AppRow[]> {
		this.assertEnabledAtRuntime();
		return await mapErrors(
			async () =>
				await this.dataTableService.updateRows(
					dataTableId,
					ctx.projectId,
					{ filter, data },
					true,
					false,
				),
		);
	}

	async deleteRows(
		ctx: AppCallContext,
		dataTableId: string,
		filter: DataTableFilter,
	): Promise<AppRow[]> {
		this.assertEnabledAtRuntime();
		return await mapErrors(
			async () =>
				await this.dataTableService.deleteRows(dataTableId, ctx.projectId, { filter }, true, false),
		);
	}

	private assertEnabled() {
		if (!this.moduleRegistry.isActive('data-table')) {
			throw new BadRequestError('Data tables are not enabled on this instance.');
		}
	}

	private assertEnabledAtRuntime() {
		if (!this.moduleRegistry.isActive('data-table')) {
			throw new AppRuntimeError(404, 'resource_missing', 'Data tables are not enabled.');
		}
	}
}

/** The table can leave the project between two calls. A value that the columns reject is the caller's error. */
async function mapErrors<T>(call: () => Promise<T>): Promise<T> {
	try {
		return await call();
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
