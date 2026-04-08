import { mockInstance } from '@n8n/backend-test-utils';
import { ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Response } from 'express';

import { DataTableRepository } from '@/modules/data-table/data-table.repository';
import { DataTableService } from '@/modules/data-table/data-table.service';
import { DataTableNotFoundError } from '@/modules/data-table/errors/data-table-not-found.error';
import type { DataTableRequest } from '@/public-api/types';
import * as middlewares from '@/public-api/v1/shared/middlewares/global.middleware';

// Mock middleware before requiring handler
const mockMiddleware = jest.fn(async (_req, _res, next) => next()) as any;
jest.spyOn(middlewares, 'apiKeyHasScope').mockReturnValue(mockMiddleware);
jest.spyOn(middlewares, 'projectScope').mockReturnValue(mockMiddleware);
jest.spyOn(middlewares, 'validCursor').mockReturnValue(mockMiddleware);

const handler = require('../data-tables.rows.handler');

describe('DataTable Handler', () => {
	let mockDataTableService: jest.Mocked<DataTableService>;
	let mockDataTableRepository: jest.Mocked<DataTableRepository>;
	let mockProjectRepository: jest.Mocked<ProjectRepository>;
	let mockResponse: Partial<Response>;

	const projectId = 'test-project-id';
	const dataTableId = 'test-data-table-id';
	const userId = 'test-user-id';

	beforeEach(() => {
		mockDataTableService = mockInstance(DataTableService);
		mockDataTableRepository = mockInstance(DataTableRepository);
		mockProjectRepository = mockInstance(ProjectRepository);

		jest.spyOn(Container, 'get').mockImplementation((serviceClass) => {
			if (serviceClass === DataTableService) {
				return mockDataTableService as any;
			}
			if (serviceClass === DataTableRepository) {
				return mockDataTableRepository as any;
			}
			if (serviceClass === ProjectRepository) {
				return mockProjectRepository as any;
			}
			return {} as any;
		});

		mockDataTableRepository.findOne.mockResolvedValue({
			id: dataTableId,
			project: { id: projectId },
		} as any);

		mockProjectRepository.getPersonalProjectForUserOrFail.mockResolvedValue({
			id: projectId,
		} as any);

		mockResponse = {
			json: jest.fn().mockReturnThis(),
			status: jest.fn().mockReturnThis(),
		};

		jest.clearAllMocks();
	});

	describe('getDataTableRows', () => {
		it('should retrieve rows successfully', async () => {
			// Arrange
			const req = {
				params: { dataTableId },
				query: { offset: '0', limit: '100' },
				user: { id: userId },
			} as unknown as DataTableRequest.GetRows;

			const mockRows = [
				{ id: 1, name: 'Test Row 1', createdAt: new Date(), updatedAt: new Date() },
				{ id: 2, name: 'Test Row 2', createdAt: new Date(), updatedAt: new Date() },
			];

			mockDataTableService.getManyRowsAndCount.mockResolvedValue({
				data: mockRows,
				count: 2,
			});

			// Act
			await handler.getDataTableRows[3](req, mockResponse as Response);

			// Assert
			expect(mockDataTableRepository.findOne).toHaveBeenCalledWith({
				where: { id: dataTableId },
				relations: ['project'],
			});
			expect(mockDataTableService.getManyRowsAndCount).toHaveBeenCalledWith(
				dataTableId,
				projectId,
				{ skip: 0, take: 100, filter: undefined, sortBy: undefined, search: undefined },
			);
			const callArg = (mockResponse.json as jest.Mock).mock.calls[0][0];
			expect(callArg).toHaveProperty('data', mockRows);
			expect(callArg).toHaveProperty('nextCursor');
		});

		it('should handle filter, sortBy, and search parameters', async () => {
			// Arrange
			const filterStr =
				'{"type":"and","filters":[{"columnName":"status","condition":"eq","value":"active"}]}';
			const req = {
				params: { dataTableId },
				query: {
					offset: '10',
					limit: '50',
					filter: filterStr,
					sortBy: 'createdAt:desc',
					search: 'test',
				},
				user: { id: userId },
			} as unknown as DataTableRequest.GetRows;

			mockDataTableService.getManyRowsAndCount.mockResolvedValue({
				data: [],
				count: 0,
			});

			// Act
			await handler.getDataTableRows[3](req, mockResponse as Response);

			// Assert
			expect(mockDataTableService.getManyRowsAndCount).toHaveBeenCalledWith(
				dataTableId,
				projectId,
				{
					skip: 10,
					take: 50,
					filter: JSON.parse(filterStr),
					sortBy: ['createdAt', 'DESC'],
					search: 'test',
				},
			);
		});

		it('should return 404 when data table not found', async () => {
			// Arrange
			const req = {
				params: { dataTableId },
				query: { offset: '0', limit: '100' },
				user: { id: userId },
			} as unknown as DataTableRequest.GetRows;

			mockDataTableRepository.findOne.mockRejectedValue(new DataTableNotFoundError(dataTableId));

			// Act
			await handler.getDataTableRows[3](req, mockResponse as Response);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(404);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: expect.stringContaining(dataTableId),
			});
		});

		it('should return 400 for validation errors', async () => {
			// Arrange
			const req = {
				params: { dataTableId },
				query: { offset: '0', limit: '100', filter: 'invalid-json' },
				user: { id: userId },
			} as unknown as DataTableRequest.GetRows;

			// Act
			await handler.getDataTableRows[3](req, mockResponse as Response);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: expect.stringContaining('Invalid'),
			});
		});
	});

	describe('insertDataTableRows', () => {
		it('should insert rows and return count', async () => {
			// Arrange
			const req = {
				params: { dataTableId },
				body: {
					data: [{ name: 'New Row' }],
					returnType: 'count',
				},
				user: { id: userId },
			} as unknown as DataTableRequest.InsertRows;

			mockDataTableService.insertRows.mockResolvedValue({ count: 1 } as any);

			// Act
			await handler.insertDataTableRows[2](req, mockResponse as Response);

			// Assert
			expect(mockDataTableService.insertRows).toHaveBeenCalledWith(
				dataTableId,
				projectId,
				[{ name: 'New Row' }],
				'count',
			);
			expect(mockResponse.json).toHaveBeenCalledWith({ count: 1 });
		});

		it('should insert rows and return IDs', async () => {
			// Arrange
			const req = {
				params: { dataTableId },
				body: {
					data: [{ name: 'Row 1' }, { name: 'Row 2' }],
					returnType: 'id',
				},
				user: { id: userId },
			} as unknown as DataTableRequest.InsertRows;

			mockDataTableService.insertRows.mockResolvedValue([1, 2] as any);

			// Act
			await handler.insertDataTableRows[2](req, mockResponse as Response);

			// Assert
			expect(mockDataTableService.insertRows).toHaveBeenCalledWith(
				dataTableId,
				projectId,
				[{ name: 'Row 1' }, { name: 'Row 2' }],
				'id',
			);
			expect(mockResponse.json).toHaveBeenCalledWith([1, 2]);
		});

		it('should insert rows and return full rows', async () => {
			// Arrange
			const req = {
				params: { dataTableId },
				body: {
					data: [{ name: 'Test' }],
					returnType: 'all',
				},
				user: { id: userId },
			} as unknown as DataTableRequest.InsertRows;

			const mockRow = { id: 1, name: 'Test', createdAt: new Date(), updatedAt: new Date() };
			mockDataTableService.insertRows.mockResolvedValue([mockRow]);

			// Act
			await handler.insertDataTableRows[2](req, mockResponse as Response);

			// Assert
			expect(mockResponse.json).toHaveBeenCalledWith([mockRow]);
		});

		it('should return 404 when data table not found', async () => {
			// Arrange
			const req = {
				params: { dataTableId },
				body: { data: [{ name: 'Test' }], returnType: 'count' },
				user: { id: userId },
			} as unknown as DataTableRequest.InsertRows;

			mockDataTableRepository.findOne.mockRejectedValue(new DataTableNotFoundError(dataTableId));

			// Act
			await handler.insertDataTableRows[2](req, mockResponse as Response);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(404);
		});
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
				user: { id: userId },
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
				user: { id: userId },
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

	describe('upsertDataTableRow', () => {
		it('should upsert row and return true when returnData is false', async () => {
			// Arrange
			const req = {
				params: { dataTableId },
				body: {
					filter: {
						type: 'and',
						filters: [{ columnName: 'email', condition: 'eq', value: 'test@example.com' }],
					},
					data: { email: 'test@example.com', name: 'Test User' },
					returnData: false,
					dryRun: false,
				},
				user: { id: userId },
			} as unknown as DataTableRequest.UpsertRow;

			mockDataTableService.upsertRow.mockResolvedValue(true);

			// Act
			await handler.upsertDataTableRow[2](req, mockResponse as Response);

			// Assert
			expect(mockDataTableService.upsertRow).toHaveBeenCalledWith(
				dataTableId,
				projectId,
				expect.objectContaining({
					filter: expect.any(Object),
					data: { email: 'test@example.com', name: 'Test User' },
				}),
				false,
				false,
			);
			expect(mockResponse.json).toHaveBeenCalledWith(true);
		});

		it('should upsert row and return upserted row when returnData is true', async () => {
			// Arrange
			const req = {
				params: { dataTableId },
				body: {
					filter: {
						type: 'and',
						filters: [{ columnName: 'email', condition: 'eq', value: 'test@example.com' }],
					},
					data: { email: 'test@example.com', name: 'Test User' },
					returnData: true,
					dryRun: false,
				},
				user: { id: userId },
			} as unknown as DataTableRequest.UpsertRow;

			const mockRow = {
				id: 1,
				email: 'test@example.com',
				name: 'Test User',
				createdAt: new Date(),
				updatedAt: new Date(),
			};
			mockDataTableService.upsertRow.mockResolvedValue(mockRow as any);

			// Act
			await handler.upsertDataTableRow[2](req, mockResponse as Response);

			// Assert
			expect(mockResponse.json).toHaveBeenCalledWith(mockRow);
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
				user: { id: userId },
			} as unknown as DataTableRequest.DeleteRows;

			const mockRow = { id: 1, name: 'Deleted', createdAt: new Date(), updatedAt: new Date() };
			mockDataTableService.deleteRows.mockResolvedValue([mockRow] as any);

			// Act
			await handler.deleteDataTableRows[2](req, mockResponse as Response);

			// Assert
			expect(mockResponse.json).toHaveBeenCalledWith([mockRow]);
		});

		it('should return 400 when filter is missing', async () => {
			// Arrange
			const req = {
				params: { dataTableId },
				query: {},
				user: { id: userId },
			} as unknown as DataTableRequest.DeleteRows;

			// Act
			await handler.deleteDataTableRows[2](req, mockResponse as Response);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: 'Required',
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
				user: { id: userId },
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

		it('should return 404 when trying to get rows from another users data table', async () => {
			// Arrange
			const req = {
				params: { dataTableId: otherUserDataTableId },
				query: { offset: '0', limit: '100' },
				user: { id: userId },
			} as unknown as DataTableRequest.GetRows;

			// User's personal project is returned
			mockProjectRepository.getPersonalProjectForUserOrFail.mockResolvedValue({
				id: projectId,
			} as any);

			// But the data table belongs to another project, so getProjectIdForDataTable throws
			mockDataTableRepository.findOne.mockRejectedValue(
				new DataTableNotFoundError(otherUserDataTableId),
			);

			// Act
			await handler.getDataTableRows[3](req, mockResponse as Response);

			// Assert
			expect(mockDataTableRepository.findOne).toHaveBeenCalledWith({
				where: { id: otherUserDataTableId },
				relations: ['project'],
			});
			expect(mockResponse.status).toHaveBeenCalledWith(404);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: expect.stringContaining(otherUserDataTableId),
			});
		});

		it('should return 404 when trying to insert rows into another users data table', async () => {
			// Arrange
			const req = {
				params: { dataTableId: otherUserDataTableId },
				body: {
					data: [{ name: 'Malicious Row' }],
					returnType: 'count',
				},
				user: { id: userId },
			} as unknown as DataTableRequest.InsertRows;

			mockProjectRepository.getPersonalProjectForUserOrFail.mockResolvedValue({
				id: projectId,
			} as any);

			mockDataTableService.insertRows.mockRejectedValue(
				new DataTableNotFoundError(otherUserDataTableId),
			);

			// Act
			await handler.insertDataTableRows[2](req, mockResponse as Response);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(404);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: expect.stringContaining(otherUserDataTableId),
			});
		});

		it('should return 404 when trying to update rows in another users data table', async () => {
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

			mockProjectRepository.getPersonalProjectForUserOrFail.mockResolvedValue({
				id: projectId,
			} as any);

			mockDataTableService.updateRows.mockRejectedValue(
				new DataTableNotFoundError(otherUserDataTableId),
			);

			// Act
			await handler.updateDataTableRows[2](req, mockResponse as Response);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(404);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: expect.stringContaining(otherUserDataTableId),
			});
		});

		it('should return 404 when trying to upsert row in another users data table', async () => {
			// Arrange
			const req = {
				params: { dataTableId: otherUserDataTableId },
				body: {
					filter: {
						type: 'and',
						filters: [{ columnName: 'email', condition: 'eq', value: 'malicious@example.com' }],
					},
					data: { email: 'malicious@example.com', name: 'Hacker' },
					returnData: false,
					dryRun: false,
				},
				user: { id: userId },
			} as unknown as DataTableRequest.UpsertRow;

			mockProjectRepository.getPersonalProjectForUserOrFail.mockResolvedValue({
				id: projectId,
			} as any);

			mockDataTableService.upsertRow.mockRejectedValue(
				new DataTableNotFoundError(otherUserDataTableId),
			);

			// Act
			await handler.upsertDataTableRow[2](req, mockResponse as Response);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(404);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: expect.stringContaining(otherUserDataTableId),
			});
		});

		it('should return 404 when trying to delete rows from another users data table', async () => {
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

			mockProjectRepository.getPersonalProjectForUserOrFail.mockResolvedValue({
				id: projectId,
			} as any);

			mockDataTableService.deleteRows.mockRejectedValue(
				new DataTableNotFoundError(otherUserDataTableId),
			);

			// Act
			await handler.deleteDataTableRows[2](req, mockResponse as Response);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(404);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: expect.stringContaining(otherUserDataTableId),
			});
		});

		it('should not leak information about data table existence in error messages', async () => {
			// Arrange
			const nonExistentDataTableId = 'non-existent-table-id';
			const req = {
				params: { dataTableId: nonExistentDataTableId },
				query: { offset: '0', limit: '100' },
				user: { id: userId },
			} as unknown as DataTableRequest.GetRows;

			mockProjectRepository.getPersonalProjectForUserOrFail.mockResolvedValue({
				id: projectId,
			} as any);

			mockDataTableRepository.findOne.mockRejectedValue(
				new DataTableNotFoundError(nonExistentDataTableId),
			);

			// Act
			await handler.getDataTableRows[3](req, mockResponse as Response);

			// Assert
			// The error message should be the same whether:
			// 1. The table doesn't exist at all
			// 2. The table exists but belongs to another user's project
			// This prevents information leakage
			expect(mockResponse.status).toHaveBeenCalledWith(404);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: expect.stringContaining(nonExistentDataTableId),
			});
		});
	});
});
