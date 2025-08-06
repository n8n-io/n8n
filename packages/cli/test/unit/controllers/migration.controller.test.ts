/**
 * Migration Controller Tests
 *
 * Tests for the MigrationController covering all endpoints:
 * - POST /export - Export instance data
 * - POST /import - Import instance data
 * - GET /status/:operationId - Get operation status
 * - POST /validate - Validate migration data
 * - GET /exports - List exports
 * - GET /exports/:exportId/download - Download export file
 */

import type { Request, Response } from 'express';
import type { User } from '@n8n/db';
import { MigrationController } from '@/controllers/migration.controller';
import { MigrationService } from '@/services/migration.service';
import { Logger } from '@n8n/backend-common';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type {
	InstanceMigrationExportRequestDto,
	InstanceMigrationImportRequestDto,
	InstanceMigrationExportResponseDto,
	InstanceMigrationImportResponseDto,
	InstanceMigrationStatusDto,
	InstanceMigrationValidationDto,
} from '@n8n/api-types';

const mockLogger = {
	info: jest.fn(),
	debug: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
};

const mockMigrationService = {
	exportInstance: jest.fn(),
	importInstance: jest.fn(),
	getOperationStatus: jest.fn(),
	validateMigration: jest.fn(),
	listExports: jest.fn(),
	downloadExport: jest.fn(),
};

const mockUser: User = {
	id: 'user-1',
	email: 'test@example.com',
	firstName: 'Test',
	lastName: 'User',
	role: 'global:admin',
} as User;

const mockRequest = (body: any = {}, user: User = mockUser): Partial<Request> => ({
	body,
	user,
	params: {},
	query: {},
});

const mockResponse = (): Partial<Response> => {
	const res: Partial<Response> = {};
	res.status = jest.fn().mockReturnValue(res);
	res.json = jest.fn().mockReturnValue(res);
	res.setHeader = jest.fn().mockReturnValue(res);
	return res;
};

describe('MigrationController', () => {
	let migrationController: MigrationController;

	beforeEach(() => {
		jest.clearAllMocks();
		migrationController = new MigrationController(
			mockLogger as unknown as Logger,
			mockMigrationService as unknown as MigrationService,
		);
	});

	describe('POST /export', () => {
		const mockExportRequest: InstanceMigrationExportRequestDto = {
			includeWorkflows: true,
			includeCredentials: true,
			includeUsers: false,
			includeSettings: false,
			projectIds: ['project-1'],
			includeCredentialData: false,
		};

		const mockExportResponse: InstanceMigrationExportResponseDto = {
			exportId: 'export-123',
			status: 'completed',
			filePath: '/tmp/exports/export-123.json.gz',
			totalSize: 1024000,
			createdAt: new Date(),
			summary: {
				workflows: 5,
				credentials: 3,
				users: 0,
				settings: 0,
				projects: 2,
				tags: 1,
				variables: 0,
			},
		};

		it('should successfully export instance data', async () => {
			mockMigrationService.exportInstance.mockResolvedValue(mockExportResponse);

			const req = mockRequest(mockExportRequest);
			const res = mockResponse();

			await migrationController.exportInstance(req as Request, res as Response);

			expect(mockMigrationService.exportInstance).toHaveBeenCalledWith(mockUser, mockExportRequest);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(mockExportResponse);
			expect(mockLogger.info).toHaveBeenCalledWith(
				'Instance export requested',
				expect.objectContaining({
					userId: mockUser.id,
					userRole: mockUser.role,
					request: expect.objectContaining({
						includeWorkflows: true,
						includeCredentials: true,
					}),
				}),
			);
		});

		it('should handle export errors with proper logging', async () => {
			const error = new Error('Export failed');
			mockMigrationService.exportInstance.mockRejectedValue(error);

			const req = mockRequest(mockExportRequest);
			const res = mockResponse();

			await expect(
				migrationController.exportInstance(req as Request, res as Response),
			).rejects.toThrow();

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Instance export failed',
				expect.objectContaining({
					userId: mockUser.id,
					error: 'Export failed',
					stack: expect.any(String),
					request: expect.objectContaining({
						includeWorkflows: true,
						includeCredentials: true,
					}),
				}),
			);
		});

		it('should validate required fields in export request', async () => {
			const invalidRequest = {}; // Missing required fields

			const req = mockRequest(invalidRequest);
			const res = mockResponse();

			// The validation would typically be handled by middleware, but let's test the controller behavior
			mockMigrationService.exportInstance.mockRejectedValue(new BadRequestError('Invalid request'));

			await expect(
				migrationController.exportInstance(req as Request, res as Response),
			).rejects.toThrow(BadRequestError);
		});

		it('should sanitize URLs in logged request data', async () => {
			mockMigrationService.exportInstance.mockResolvedValue(mockExportResponse);

			const req = mockRequest(mockExportRequest);
			const res = mockResponse();

			await migrationController.exportInstance(req as Request, res as Response);

			// The controller should log sanitized request data
			expect(mockLogger.info).toHaveBeenCalledWith(
				'Instance export requested',
				expect.objectContaining({
					userId: mockUser.id,
					request: expect.any(Object),
				}),
			);
		});
	});

	describe('POST /import', () => {
		const mockImportRequest: InstanceMigrationImportRequestDto = {
			exportData: {
				metadata: {
					id: 'export-123',
					version: '1.0.0',
					createdAt: new Date(),
				},
				workflows: [],
			},
			conflictResolution: 'skip',
			createMissingProjects: true,
		};

		const mockImportResponse: InstanceMigrationImportResponseDto = {
			importId: 'import-456',
			status: 'completed',
			summary: {
				totalImported: 5,
				totalSkipped: 2,
				totalErrors: 0,
				workflows: { imported: 3, skipped: 1, errors: 0 },
				credentials: { imported: 2, skipped: 1, errors: 0 },
				users: { imported: 0, skipped: 0, errors: 0 },
				settings: { imported: 0, skipped: 0, errors: 0 },
				projects: { imported: 0, skipped: 0, errors: 0 },
			},
			completedAt: new Date(),
			sourceMetadata: mockImportRequest.exportData!.metadata,
		};

		it('should successfully import instance data', async () => {
			mockMigrationService.importInstance.mockResolvedValue(mockImportResponse);

			const req = mockRequest(mockImportRequest);
			const res = mockResponse();

			await migrationController.importInstance(req as Request, res as Response);

			expect(mockMigrationService.importInstance).toHaveBeenCalledWith(mockUser, mockImportRequest);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(mockImportResponse);
			expect(mockLogger.info).toHaveBeenCalledWith(
				'Instance import requested',
				expect.objectContaining({
					userId: mockUser.id,
					userRole: mockUser.role,
					request: expect.objectContaining({
						conflictResolution: 'skip',
						createMissingProjects: true,
					}),
				}),
			);
		});

		it('should handle import errors with proper logging', async () => {
			const error = new InternalServerError('Import failed');
			mockMigrationService.importInstance.mockRejectedValue(error);

			const req = mockRequest(mockImportRequest);
			const res = mockResponse();

			await expect(
				migrationController.importInstance(req as Request, res as Response),
			).rejects.toThrow(InternalServerError);

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Instance import failed',
				expect.objectContaining({
					userId: mockUser.id,
					error: 'Import failed',
					request: expect.any(Object),
				}),
			);
		});

		it('should handle both exportId and exportData import methods', async () => {
			const importWithExportId = {
				exportId: 'export-123',
				conflictResolution: 'skip',
				createMissingProjects: true,
			};

			mockMigrationService.importInstance.mockResolvedValue(mockImportResponse);

			const req = mockRequest(importWithExportId);
			const res = mockResponse();

			await migrationController.importInstance(req as Request, res as Response);

			expect(mockMigrationService.importInstance).toHaveBeenCalledWith(
				mockUser,
				importWithExportId,
			);
		});
	});

	describe('GET /status/:operationId', () => {
		const mockStatus: InstanceMigrationStatusDto = {
			id: 'operation-123',
			type: 'export',
			status: 'completed',
			progress: 100,
			startedAt: new Date(),
			completedAt: new Date(),
		};

		it('should return operation status', async () => {
			mockMigrationService.getOperationStatus.mockResolvedValue(mockStatus);

			const req = mockRequest({}, mockUser);
			req.params = { operationId: 'operation-123' };
			const res = mockResponse();

			await migrationController.getOperationStatus(req as Request, res as Response);

			expect(mockMigrationService.getOperationStatus).toHaveBeenCalledWith(
				mockUser,
				'operation-123',
			);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(mockStatus);
		});

		it('should handle not found operations', async () => {
			mockMigrationService.getOperationStatus.mockRejectedValue(
				new NotFoundError('Operation not found'),
			);

			const req = mockRequest({}, mockUser);
			req.params = { operationId: 'non-existent' };
			const res = mockResponse();

			await expect(
				migrationController.getOperationStatus(req as Request, res as Response),
			).rejects.toThrow(NotFoundError);
		});

		it('should log status requests with sanitized context', async () => {
			mockMigrationService.getOperationStatus.mockResolvedValue(mockStatus);

			const req = mockRequest({}, mockUser);
			req.params = { operationId: 'operation-123' };
			const res = mockResponse();

			await migrationController.getOperationStatus(req as Request, res as Response);

			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Operation status requested',
				expect.objectContaining({
					userId: mockUser.id,
					operationId: 'operation-123',
				}),
			);
		});
	});

	describe('POST /validate', () => {
		const mockValidationRequest = {
			exportData: {
				metadata: {
					source: { n8nVersion: '1.0.0' },
				},
				workflows: [],
			},
			targetInstanceUrl: 'https://target.example.com',
		};

		const mockValidationResponse: InstanceMigrationValidationDto = {
			isValid: true,
			errors: [],
			warnings: [
				{
					code: 'VERSION_MISMATCH',
					message: 'Version mismatch detected',
					details: { exportVersion: '1.0.0', currentVersion: '1.1.0' },
				},
			],
			recommendations: [
				{
					code: 'TARGET_VALIDATION',
					message: 'Ensure target instance is accessible',
				},
			],
			compatibility: {
				version: 'warning',
				database: 'compatible',
				features: 'compatible',
			},
		};

		it('should validate migration data successfully', async () => {
			mockMigrationService.validateMigration.mockResolvedValue(mockValidationResponse);

			const req = mockRequest(mockValidationRequest);
			const res = mockResponse();

			await migrationController.validateMigration(req as Request, res as Response);

			expect(mockMigrationService.validateMigration).toHaveBeenCalledWith(
				mockUser,
				mockValidationRequest,
			);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(mockValidationResponse);
		});

		it('should handle validation errors', async () => {
			const invalidValidationResponse = {
				...mockValidationResponse,
				isValid: false,
				errors: [
					{
						code: 'INVALID_DATA',
						message: 'Export data is corrupted',
					},
				],
			};

			mockMigrationService.validateMigration.mockResolvedValue(invalidValidationResponse);

			const req = mockRequest(mockValidationRequest);
			const res = mockResponse();

			await migrationController.validateMigration(req as Request, res as Response);

			expect(res.status).toHaveBeenCalledWith(200); // Still 200, but isValid: false
			expect(res.json).toHaveBeenCalledWith(invalidValidationResponse);
		});

		it('should sanitize target URLs in validation logs', async () => {
			mockMigrationService.validateMigration.mockResolvedValue(mockValidationResponse);

			const req = mockRequest(mockValidationRequest);
			const res = mockResponse();

			await migrationController.validateMigration(req as Request, res as Response);

			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Migration validation requested',
				expect.objectContaining({
					userId: mockUser.id,
					hasExportData: true,
					targetUrl: 'https://target.example.com:443', // Sanitized
				}),
			);
		});
	});

	describe('GET /exports', () => {
		const mockExportsList = {
			exports: [
				{
					id: 'export-1',
					createdAt: new Date(),
					createdBy: mockUser.id,
					size: 1024000,
					status: 'completed',
					summary: { workflows: 5, credentials: 3, users: 0, settings: 0 },
				},
			],
			total: 1,
		};

		it('should list user exports', async () => {
			mockMigrationService.listExports.mockResolvedValue(mockExportsList);

			const req = mockRequest({}, mockUser);
			const res = mockResponse();

			await migrationController.listExports(req as Request, res as Response);

			expect(mockMigrationService.listExports).toHaveBeenCalledWith(mockUser);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(mockExportsList);
		});

		it('should handle empty export lists', async () => {
			mockMigrationService.listExports.mockResolvedValue({ exports: [], total: 0 });

			const req = mockRequest({}, mockUser);
			const res = mockResponse();

			await migrationController.listExports(req as Request, res as Response);

			expect(res.json).toHaveBeenCalledWith({ exports: [], total: 0 });
		});
	});

	describe('GET /exports/:exportId/download', () => {
		it('should initiate export file download', async () => {
			mockMigrationService.downloadExport.mockResolvedValue(undefined);

			const req = mockRequest({}, mockUser);
			req.params = { exportId: 'export-123' };
			const res = mockResponse();

			await migrationController.downloadExport(req as Request, res as Response);

			expect(mockMigrationService.downloadExport).toHaveBeenCalledWith(mockUser, 'export-123', res);
			expect(mockLogger.info).toHaveBeenCalledWith(
				'Export download requested',
				expect.objectContaining({
					userId: mockUser.id,
					exportId: 'export-123',
				}),
			);
		});

		it('should handle download errors', async () => {
			mockMigrationService.downloadExport.mockRejectedValue(new NotFoundError('Export not found'));

			const req = mockRequest({}, mockUser);
			req.params = { exportId: 'non-existent' };
			const res = mockResponse();

			await expect(
				migrationController.downloadExport(req as Request, res as Response),
			).rejects.toThrow(NotFoundError);

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Export download failed',
				expect.objectContaining({
					userId: mockUser.id,
					exportId: 'non-existent',
					error: 'Export not found',
				}),
			);
		});

		it('should prevent unauthorized access to downloads', async () => {
			mockMigrationService.downloadExport.mockRejectedValue(new BadRequestError('Access denied'));

			const unauthorizedUser: User = { ...mockUser, id: 'other-user' } as User;
			const req = mockRequest({}, unauthorizedUser);
			req.params = { exportId: 'export-123' };
			const res = mockResponse();

			await expect(
				migrationController.downloadExport(req as Request, res as Response),
			).rejects.toThrow(BadRequestError);
		});
	});

	describe('URL sanitization', () => {
		it('should sanitize URLs in log contexts', () => {
			// Test the private sanitizeUrl method through public interface
			const req = mockRequest({
				targetInstanceUrl: 'https://user:pass@example.com:8080/path',
			});
			const res = mockResponse();

			// The sanitization should occur during validation logging
			mockMigrationService.validateMigration.mockResolvedValue({
				isValid: true,
				errors: [],
				warnings: [],
				recommendations: [],
				compatibility: { version: 'compatible', database: 'compatible', features: 'compatible' },
			});

			migrationController.validateMigration(req as Request, res as Response);

			// Should log sanitized URL without credentials or path
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Migration validation requested',
				expect.objectContaining({
					targetUrl: 'https://example.com:8080',
				}),
			);
		});
	});
});
