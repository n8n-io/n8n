import { mockInstance } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { GLOBAL_MEMBER_SCOPES, type Scope } from '@n8n/permissions';
import type { Response } from 'express';
import type { Mocked } from 'vitest';

import { BadRequestError, NotFoundError } from '@n8n/errors';
import { DataTableAggregateService } from '@/modules/data-table/data-table-aggregate.service';
import { DataTableService } from '@/modules/data-table/data-table.service';
import { DataTableNotFoundError } from '@/modules/data-table/errors/data-table-not-found.error';
import type { DataTableRequest } from '@/public-api/types';
import * as middlewares from '@/public-api/v1/shared/middlewares/global.middleware';

// Mock middleware before requiring handler
const mockMiddleware = vi.fn(async (_req, _res, next) => next()) as any;
vi.spyOn(middlewares, 'publicApiScope').mockReturnValue(mockMiddleware);
vi.spyOn(middlewares, 'projectScope').mockReturnValue(mockMiddleware);

// Loaded after the middleware spies above are installed; typed loosely so the
// suite can invoke individual route entries by index.
let handler: Record<string, Array<(...args: unknown[]) => unknown>>;

beforeAll(async () => {
	handler = (await import('../data-tables.rows.handler.js')) as unknown as typeof handler;
});

describe('DataTable Handler', () => {
	let mockDataTableService: Mocked<DataTableService>;
	let mockDataTableAggregateService: Mocked<DataTableAggregateService>;
	let mockResponse: Partial<Response>;

	const projectId = 'test-project-id';
	const dataTableId = 'test-data-table-id';
	const userId = 'test-user-id';

	const makeUser = (scopeSlugs: Scope[] = GLOBAL_MEMBER_SCOPES) => ({
		id: userId,
		role: { slug: 'global:member', scopes: scopeSlugs.map((slug) => ({ slug })) },
	});

	beforeEach(() => {
		mockDataTableService = mockInstance(DataTableService);
		mockDataTableAggregateService = mockInstance(DataTableAggregateService);

		vi.spyOn(Container, 'get').mockImplementation((serviceClass) => {
			if (serviceClass === DataTableService) {
				return mockDataTableService;
			}
			if (serviceClass === DataTableAggregateService) {
				return mockDataTableAggregateService;
			}
			return {};
		});

		mockDataTableService.getProjectIdForDataTable.mockResolvedValue(projectId);
		mockDataTableService.getCachedSizeBytesByIds.mockResolvedValue(new Map());

		mockResponse = {
			json: vi.fn().mockReturnThis(),
			status: vi.fn().mockReturnThis(),
			send: vi.fn().mockReturnThis(),
		};
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('updateDataTableRows', () => {
		it('should update rows and return true when returnData is false', async () => {
			// Arrange
			const req = {
				params: { dataTableId },
				body: {
					filter: { type: 'and', filters: [{ columnName: 'id', condition: 'eq', value: 1 }] },
					data: { status: 'updated' },
					returnData: false,
					dryRun: false,
				},
				user: { id: userId },
			} as unknown as DataTableRequest.UpdateRows;

			mockDataTableService.updateRows.mockResolvedValue(true);

			// Act
			await handler.updateDataTableRows[2](req, mockResponse as Response);

			// Assert
			expect(mockDataTableService.updateRows).toHaveBeenCalledWith(
				dataTableId,
				projectId,
				{
					filter: { type: 'and', filters: [{ columnName: 'id', condition: 'eq', value: 1 }] },
					data: { status: 'updated' },
				},
				false,
				false,
			);
			expect(mockResponse.json).toHaveBeenCalledWith(true);
		});

		it('should update rows and return updated rows when returnData is true', async () => {
			// Arrange
			const req = {
				params: { dataTableId },
				body: {
					filter: { type: 'and', filters: [{ columnName: 'id', condition: 'eq', value: 1 }] },
					data: { status: 'updated' },
					returnData: true,
					dryRun: false,
				},
				user: makeUser(['dataTable:readRow']),
			} as unknown as DataTableRequest.UpdateRows;

			const mockRow = { id: 1, status: 'updated', createdAt: new Date(), updatedAt: new Date() };
			mockDataTableService.updateRows.mockResolvedValue([mockRow] as any);

			// Act
			await handler.updateDataTableRows[2](req, mockResponse as Response);

			// Assert
			expect(mockResponse.json).toHaveBeenCalledWith([mockRow]);
		});

		it('should support dry run mode', async () => {
			// Arrange
			const req = {
				params: { dataTableId },
				body: {
					filter: {
						type: 'and',
						filters: [{ columnName: 'id', condition: 'eq', value: 1 }],
					},
					data: { status: 'test' },
					returnData: true,
					dryRun: true,
				},
				user: makeUser(['dataTable:readRow']),
			} as unknown as DataTableRequest.UpdateRows;

			const mockDryRunResult = [
				{ id: 1, status: 'old', dryRunState: 'before' },
				{ id: 1, status: 'test', dryRunState: 'after' },
			];
			mockDataTableService.updateRows.mockResolvedValue(mockDryRunResult as any);

			// Act
			await handler.updateDataTableRows[2](req, mockResponse as Response);

			// Assert
			expect(mockDataTableService.updateRows).toHaveBeenCalledWith(
				dataTableId,
				projectId,
				expect.any(Object),
				true,
				true,
			);
		});
	});

	describe('deleteDataTableRows', () => {
		it('should delete rows and return true when returnData is false', async () => {
			// Arrange
			const filterStr = JSON.stringify({
				type: 'and',
				filters: [{ columnName: 'status', condition: 'eq', value: 'archived' }],
			});
			const req = {
				params: { dataTableId },
				query: {
					filter: filterStr,
					returnData: 'false',
					dryRun: 'false',
				},
				user: { id: userId },
			} as unknown as DataTableRequest.DeleteRows;

			mockDataTableService.deleteRows.mockResolvedValue(true);

			// Act
			await handler.deleteDataTableRows[2](req, mockResponse as Response);

			// Assert
			expect(mockDataTableService.deleteRows).toHaveBeenCalledWith(
				dataTableId,
				projectId,
				{
					filter: JSON.parse(filterStr),
				},
				false,
				false,
			);
			expect(mockResponse.json).toHaveBeenCalledWith(true);
		});

		it('should delete rows and return deleted rows when returnData is true', async () => {
			// Arrange
			const filterStr = JSON.stringify({
				type: 'and',
				filters: [{ columnName: 'id', condition: 'eq', value: 1 }],
			});
			const req = {
				params: { dataTableId },
				query: {
					filter: filterStr,
					returnData: 'true',
					dryRun: 'false',
				},
				user: makeUser(['dataTable:readRow']),
			} as unknown as DataTableRequest.DeleteRows;

			const mockRow = { id: 1, name: 'Deleted', createdAt: new Date(), updatedAt: new Date() };
			mockDataTableService.deleteRows.mockResolvedValue([mockRow] as any);

			// Act
			await handler.deleteDataTableRows[2](req, mockResponse as Response);

			// Assert
			expect(mockResponse.json).toHaveBeenCalledWith([mockRow]);
		});

		it('should throw BadRequestError when filter is missing', async () => {
			// Arrange
			const req = {
				params: { dataTableId },
				query: {},
				user: { id: userId },
			} as unknown as DataTableRequest.DeleteRows;

			// Act
			const handlerFn = handler.deleteDataTableRows[2];
			let caught: unknown;
			try {
				await handlerFn(req, mockResponse as Response);
			} catch (error) {
				caught = error;
			}

			// Assert
			expect(caught).toBeInstanceOf(BadRequestError);
			expect(caught).toMatchObject({
				message: 'Required',
				httpStatusCode: 400,
			});
		});

		it('should support dry run mode', async () => {
			// Arrange
			const filterStr = JSON.stringify({
				type: 'and',
				filters: [{ columnName: 'status', condition: 'eq', value: 'test' }],
			});
			const req = {
				params: { dataTableId },
				query: {
					filter: filterStr,
					returnData: 'true',
					dryRun: 'true',
				},
				user: makeUser(['dataTable:readRow']),
			} as unknown as DataTableRequest.DeleteRows;

			const mockRows = [{ id: 1, status: 'test', createdAt: new Date(), updatedAt: new Date() }];
			mockDataTableService.deleteRows.mockResolvedValue(mockRows as any);

			// Act
			await handler.deleteDataTableRows[2](req, mockResponse as Response);

			// Assert
			expect(mockDataTableService.deleteRows).toHaveBeenCalledWith(
				dataTableId,
				projectId,
				expect.objectContaining({ filter: expect.any(Object) }),
				true,
				true,
			);
		});
	});

	describe('Security - Cross-Project Access', () => {
		const otherUserDataTableId = 'other-user-data-table-id';

		it('should throw NotFoundError when trying to update rows in another users data table', async () => {
			// Arrange
			const req = {
				params: { dataTableId: otherUserDataTableId },
				body: {
					filter: { type: 'and', filters: [{ columnName: 'id', condition: 'eq', value: 1 }] },
					data: { status: 'hacked' },
					returnData: false,
					dryRun: false,
				},
				user: { id: userId },
			} as unknown as DataTableRequest.UpdateRows;

			mockDataTableService.updateRows.mockRejectedValue(
				new DataTableNotFoundError(otherUserDataTableId),
			);

			// Act
			const handlerFn = handler.updateDataTableRows[2];
			let caught: unknown;
			try {
				await handlerFn(req, mockResponse as Response);
			} catch (error) {
				caught = error;
			}

			// Assert
			expect(caught).toBeInstanceOf(NotFoundError);
			expect(caught).toMatchObject({
				message: expect.stringContaining(otherUserDataTableId),
				httpStatusCode: 404,
			});
		});

		it('should throw NotFoundError when trying to delete rows from another users data table', async () => {
			// Arrange
			const filterStr = JSON.stringify({
				type: 'and',
				filters: [{ columnName: 'id', condition: 'eq', value: 1 }],
			});
			const req = {
				params: { dataTableId: otherUserDataTableId },
				query: {
					filter: filterStr,
					returnData: 'false',
					dryRun: 'false',
				},
				user: { id: userId },
			} as unknown as DataTableRequest.DeleteRows;

			mockDataTableService.deleteRows.mockRejectedValue(
				new DataTableNotFoundError(otherUserDataTableId),
			);

			// Act
			const handlerFn = handler.deleteDataTableRows[2];
			let caught: unknown;
			try {
				await handlerFn(req, mockResponse as Response);
			} catch (error) {
				caught = error;
			}

			// Assert
			expect(caught).toBeInstanceOf(NotFoundError);
			expect(caught).toMatchObject({
				message: expect.stringContaining(otherUserDataTableId),
				httpStatusCode: 404,
			});
		});

		it('should not leak information about data table existence in error messages', async () => {
			// Arrange
			const nonExistentDataTableId = 'non-existent-table-id';
			const filterStr = JSON.stringify({
				type: 'and',
				filters: [{ columnName: 'id', condition: 'eq', value: 1 }],
			});
			const req = {
				params: { dataTableId: nonExistentDataTableId },
				query: { filter: filterStr },
				user: { id: userId },
			} as unknown as DataTableRequest.DeleteRows;

			mockDataTableService.getProjectIdForDataTable.mockRejectedValue(
				new DataTableNotFoundError(nonExistentDataTableId),
			);

			// Act
			const handlerFn = handler.deleteDataTableRows[2];
			let caught: unknown;
			try {
				await handlerFn(req, mockResponse as Response);
			} catch (error) {
				caught = error;
			}

			// Assert
			// The error message should be the same whether:
			// 1. The table doesn't exist at all
			// 2. The table exists but belongs to another user's project
			// This prevents information leakage
			expect(caught).toBeInstanceOf(NotFoundError);
			expect(caught).toMatchObject({
				message: expect.stringContaining(nonExistentDataTableId),
				httpStatusCode: 404,
			});
		});
	});
});
