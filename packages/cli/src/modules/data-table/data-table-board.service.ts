import type { DataTableListOptions } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type {
	DataTableFilter,
	DataTableRow,
	DataTableRowReturn,
	DataTableRows,
} from 'n8n-workflow';

import { DataTableColumnRepository } from './data-table-column.repository';
import { DataTableRowsRepository } from './data-table-rows.repository';
import { DataTable, type DataTableMetadata } from './data-table.entity';
import { DataTableRepository } from './data-table.repository';
import { DataTableService } from './data-table.service';
import { DataTableNotFoundError } from './errors/data-table-not-found.error';
import { DataTableValidationError } from './errors/data-table-validation.error';
import { normalizeRows } from './utils/sql-utils';

export interface CreateBoardDto {
	name: string;
	statuses: string[];
}

export interface BoardItem {
	name: string;
	status: string;
	description?: string;
}

export interface UpdateBoardItemDto {
	name?: string;
	status?: string;
	description?: string;
}

const BOARD_COLUMNS = [
	{ name: 'status', type: 'string' as const, index: 0 },
	{ name: 'name', type: 'string' as const, index: 1 },
	{ name: 'description', type: 'string' as const, index: 2 },
];

@Service()
export class DataTableBoardService {
	constructor(
		private readonly dataTableRepository: DataTableRepository,
		private readonly dataTableColumnRepository: DataTableColumnRepository,
		private readonly dataTableRowsRepository: DataTableRowsRepository,
		private readonly dataTableService: DataTableService,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('data-table');
	}

	// ─── Board CRUD ───────────────────────────────────────────────────────────────

	async createBoard(projectId: string, dto: CreateBoardDto): Promise<DataTable> {
		if (dto.statuses.length === 0) {
			throw new DataTableValidationError('A board must have at least one status');
		}

		this.validateStatusNames(dto.statuses);

		const dataTable = await this.dataTableRepository.createDataTable(
			projectId,
			dto.name,
			BOARD_COLUMNS,
		);

		await this.dataTableRepository.update(
			{ id: dataTable.id },
			{
				kind: 'board',
				metadata: { allowedStatuses: dto.statuses },
			},
		);

		return await this.dataTableRepository.findOneOrFail({
			where: { id: dataTable.id },
			relations: ['project', 'columns'],
		});
	}

	async getBoard(boardId: string, projectId: string): Promise<DataTable> {
		return await this.validateBoardExists(boardId, projectId);
	}

	async updateBoard(boardId: string, projectId: string, dto: { name: string }): Promise<boolean> {
		await this.validateBoardExists(boardId, projectId);
		return await this.dataTableService.updateDataTable(boardId, projectId, dto);
	}

	async deleteBoard(boardId: string, projectId: string): Promise<boolean> {
		await this.validateBoardExists(boardId, projectId);
		return await this.dataTableService.deleteDataTable(boardId, projectId);
	}

	async listBoards(projectId: string) {
		const filter: DataTableListOptions['filter'] = { projectId, kind: 'board' };
		return await this.dataTableService.getManyAndCount({ filter });
	}

	// ─── Board Item CRUD ──────────────────────────────────────────────────────────

	async createItem(
		boardId: string,
		projectId: string,
		item: BoardItem,
	): Promise<DataTableRowReturn[]> {
		const board = await this.validateBoardExists(boardId, projectId);
		this.validateItemStatus(item.status, board.metadata);

		const rows: DataTableRows = [
			{
				status: item.status,
				name: item.name,
				description: item.description ?? '',
			},
		];

		return await this.dataTableService.insertRows(boardId, projectId, rows, 'all');
	}

	async getItems(
		boardId: string,
		projectId: string,
		options?: { status?: string; skip?: number; take?: number },
	) {
		await this.validateBoardExists(boardId, projectId);

		const filter: DataTableFilter | undefined = options?.status
			? {
					type: 'and',
					filters: [{ columnName: 'status', condition: 'eq', value: options.status }],
				}
			: undefined;

		return await this.dataTableService.getManyRowsAndCount(boardId, projectId, {
			skip: options?.skip ?? 0,
			take: options?.take,
			filter,
		});
	}

	async getItemById(
		boardId: string,
		projectId: string,
		itemId: string,
	): Promise<DataTableRowReturn | undefined> {
		await this.validateBoardExists(boardId, projectId);

		const result = await this.dataTableColumnRepository.manager.transaction(async (em) => {
			const columns = await this.dataTableColumnRepository.getColumns(boardId, em);
			const { data } = await this.dataTableRowsRepository.getManyAndCount(
				boardId,
				{
					skip: 0,
					filter: {
						type: 'and',
						filters: [{ columnName: 'id', condition: 'eq', value: itemId }],
					},
				},
				columns,
				em,
			);
			return data.length > 0 ? normalizeRows(data, columns)[0] : undefined;
		});

		return result;
	}

	async updateItem(boardId: string, projectId: string, itemId: string, dto: UpdateBoardItemDto) {
		const board = await this.validateBoardExists(boardId, projectId);

		if (dto.status !== undefined) {
			this.validateItemStatus(dto.status, board.metadata);
		}

		const data: DataTableRow = {};
		if (dto.name !== undefined) data.name = dto.name;
		if (dto.status !== undefined) data.status = dto.status;
		if (dto.description !== undefined) data.description = dto.description;

		if (Object.keys(data).length === 0) {
			throw new DataTableValidationError('At least one field must be provided to update');
		}

		return await this.dataTableService.updateRows(
			boardId,
			projectId,
			{
				filter: {
					type: 'and',
					filters: [{ columnName: 'id', condition: 'eq', value: itemId }],
				},
				data,
			},
			true,
		);
	}

	async deleteItem(
		boardId: string,
		projectId: string,
		itemId: string,
	): Promise<DataTableRowReturn[]> {
		await this.validateBoardExists(boardId, projectId);

		return await this.dataTableService.deleteRows(
			boardId,
			projectId,
			{
				filter: {
					type: 'and',
					filters: [{ columnName: 'id', condition: 'eq', value: itemId }],
				},
			},
			true,
		);
	}

	// ─── Status CRUD ──────────────────────────────────────────────────────────────

	async getStatuses(boardId: string, projectId: string): Promise<string[]> {
		const board = await this.validateBoardExists(boardId, projectId);
		return board.metadata.allowedStatuses ?? [];
	}

	async addStatus(boardId: string, projectId: string, status: string): Promise<string[]> {
		const board = await this.validateBoardExists(boardId, projectId);
		const statuses = board.metadata.allowedStatuses ?? [];

		this.validateStatusNames([status]);

		if (statuses.includes(status)) {
			throw new DataTableValidationError(`Status '${status}' already exists on this board`);
		}

		const updatedStatuses = [...statuses, status];
		await this.updateMetadataStatuses(boardId, updatedStatuses);
		return updatedStatuses;
	}

	async renameStatus(
		boardId: string,
		projectId: string,
		oldStatus: string,
		newStatus: string,
	): Promise<string[]> {
		const board = await this.validateBoardExists(boardId, projectId);
		const statuses = board.metadata.allowedStatuses ?? [];

		if (!statuses.includes(oldStatus)) {
			throw new DataTableValidationError(`Status '${oldStatus}' does not exist on this board`);
		}

		this.validateStatusNames([newStatus]);

		if (oldStatus !== newStatus && statuses.includes(newStatus)) {
			throw new DataTableValidationError(`Status '${newStatus}' already exists on this board`);
		}

		const updatedStatuses = statuses.map((s) => (s === oldStatus ? newStatus : s));
		await this.updateMetadataStatuses(boardId, updatedStatuses);

		if (oldStatus !== newStatus) {
			await this.dataTableService.updateRows(
				boardId,
				projectId,
				{
					filter: {
						type: 'and',
						filters: [{ columnName: 'status', condition: 'eq', value: oldStatus }],
					},
					data: { status: newStatus },
				},
				false,
			);
		}

		return updatedStatuses;
	}

	async deleteStatus(
		boardId: string,
		projectId: string,
		status: string,
		migrateTo?: string,
	): Promise<string[]> {
		const board = await this.validateBoardExists(boardId, projectId);
		const statuses = board.metadata.allowedStatuses ?? [];

		if (!statuses.includes(status)) {
			throw new DataTableValidationError(`Status '${status}' does not exist on this board`);
		}

		if (statuses.length <= 1) {
			throw new DataTableValidationError('Cannot delete the last status from a board');
		}

		if (migrateTo !== undefined) {
			if (!statuses.includes(migrateTo)) {
				throw new DataTableValidationError(
					`Migration target status '${migrateTo}' does not exist on this board`,
				);
			}

			await this.dataTableService.updateRows(
				boardId,
				projectId,
				{
					filter: {
						type: 'and',
						filters: [{ columnName: 'status', condition: 'eq', value: status }],
					},
					data: { status: migrateTo },
				},
				false,
			);
		} else {
			await this.dataTableService.deleteRows(
				boardId,
				projectId,
				{
					filter: {
						type: 'and',
						filters: [{ columnName: 'status', condition: 'eq', value: status }],
					},
				},
				false,
			);
		}

		const updatedStatuses = statuses.filter((s) => s !== status);
		await this.updateMetadataStatuses(boardId, updatedStatuses);
		return updatedStatuses;
	}

	async reorderStatuses(
		boardId: string,
		projectId: string,
		orderedStatuses: string[],
	): Promise<string[]> {
		const board = await this.validateBoardExists(boardId, projectId);
		const currentStatuses = board.metadata.allowedStatuses ?? [];

		const currentSet = new Set(currentStatuses);
		const newSet = new Set(orderedStatuses);

		if (currentSet.size !== newSet.size || ![...currentSet].every((s) => newSet.has(s))) {
			throw new DataTableValidationError(
				'Reordered statuses must contain exactly the same statuses as the current board',
			);
		}

		await this.updateMetadataStatuses(boardId, orderedStatuses);
		return orderedStatuses;
	}

	// ─── Private Helpers ──────────────────────────────────────────────────────────

	private async validateBoardExists(boardId: string, projectId: string): Promise<DataTable> {
		const dataTable = await this.dataTableRepository.findOne({
			where: { id: boardId, projectId, kind: 'board' },
			relations: ['columns'],
		});

		if (!dataTable) {
			throw new DataTableNotFoundError(boardId);
		}

		return dataTable;
	}

	private validateItemStatus(status: string, metadata: DataTableMetadata): void {
		const allowed = metadata.allowedStatuses ?? [];
		if (!allowed.includes(status)) {
			throw new DataTableValidationError(
				`Invalid status '${status}'. Allowed statuses: ${allowed.join(', ')}`,
			);
		}
	}

	private validateStatusNames(statuses: string[]): void {
		for (const status of statuses) {
			if (!status.trim()) {
				throw new DataTableValidationError('Status name cannot be empty');
			}
		}

		const unique = new Set(statuses);
		if (unique.size !== statuses.length) {
			throw new DataTableValidationError('Duplicate status names are not allowed');
		}
	}

	private async updateMetadataStatuses(boardId: string, statuses: string[]): Promise<void> {
		await this.dataTableRepository.update(
			{ id: boardId },
			{ metadata: { allowedStatuses: statuses } },
		);
	}
}
