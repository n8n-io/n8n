'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const migration_service_1 = require('@/services/migration.service');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const internal_server_error_1 = require('@/errors/response-errors/internal-server.error');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const mockWorkflowRepository = {
	createQueryBuilder: jest.fn(),
	find: jest.fn(),
	findOne: jest.fn(),
	save: jest.fn(),
};
const mockCredentialsRepository = {
	createQueryBuilder: jest.fn(),
	find: jest.fn(),
	findOne: jest.fn(),
	save: jest.fn(),
};
const mockSharedWorkflowRepository = {};
const mockSharedCredentialsRepository = {};
const mockProjectRepository = {
	createQueryBuilder: jest.fn(),
	find: jest.fn(),
	findOne: jest.fn(),
	save: jest.fn(),
};
const mockUserRepository = {
	find: jest.fn(),
	findOne: jest.fn(),
	save: jest.fn(),
};
const mockSettingsRepository = {
	find: jest.fn(),
	findOne: jest.fn(),
	save: jest.fn(),
};
const mockTagRepository = {
	find: jest.fn(),
};
const mockVariablesRepository = {
	find: jest.fn(),
};
const mockLogger = {
	info: jest.fn(),
	debug: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
};
const mockEventService = {
	emit: jest.fn(),
};
const mockMigrationSecurityService = {
	validateExportRequest: jest.fn(),
	validateImportRequest: jest.fn(),
	encryptSensitiveData: jest.fn(),
	decryptSensitiveData: jest.fn(),
};
const mockUser = {
	id: 'user-1',
	email: 'test@example.com',
	firstName: 'Test',
	lastName: 'User',
	role: 'global:admin',
};
describe('MigrationService', () => {
	let migrationService;
	beforeEach(() => {
		jest.clearAllMocks();
		migrationService = new migration_service_1.MigrationService(
			mockLogger,
			mockWorkflowRepository,
			mockCredentialsRepository,
			mockSharedWorkflowRepository,
			mockSharedCredentialsRepository,
			mockProjectRepository,
			mockUserRepository,
			mockSettingsRepository,
			mockTagRepository,
			mockVariablesRepository,
			mockEventService,
			mockMigrationSecurityService,
		);
	});
	describe('exportInstance', () => {
		const mockExportRequest = {
			includeWorkflows: true,
			includeCredentials: true,
			includeUsers: false,
			includeSettings: false,
			projectIds: ['project-1'],
			includeCredentialData: false,
		};
		beforeEach(() => {
			const mockQueryBuilder = {
				leftJoinAndSelect: jest.fn().mockReturnThis(),
				where: jest.fn().mockReturnThis(),
				getMany: jest.fn().mockResolvedValue([
					{
						id: 'workflow-1',
						name: 'Test Workflow',
						nodes: [],
						shared: { projectId: 'project-1' },
					},
				]),
			};
			mockWorkflowRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
			mockCredentialsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
			mockProjectRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
			mockTagRepository.find.mockResolvedValue([]);
			mockVariablesRepository.find.mockResolvedValue([]);
		});
		it('should successfully export instance data', async () => {
			const result = await migrationService.exportInstance(mockUser, mockExportRequest);
			expect(result).toMatchObject({
				exportId: expect.any(String),
				status: 'completed',
				filePath: expect.any(String),
				totalSize: expect.any(Number),
				createdAt: expect.any(Date),
				summary: {
					workflows: 1,
					credentials: 1,
					users: 0,
					settings: 0,
					projects: 1,
					tags: 0,
					variables: 0,
				},
			});
			expect(mockLogger.info).toHaveBeenCalledWith(
				'Starting instance export',
				expect.objectContaining({ exportId: expect.any(String), userId: mockUser.id }),
			);
			expect(mockLogger.info).toHaveBeenCalledWith(
				'Instance export completed',
				expect.objectContaining({
					exportId: expect.any(String),
					size: expect.any(Number),
					duration: expect.any(Number),
				}),
			);
		});
		it('should handle export with specific project IDs', async () => {
			await migrationService.exportInstance(mockUser, mockExportRequest);
			expect(mockWorkflowRepository.createQueryBuilder).toHaveBeenCalled();
			const queryBuilder = mockWorkflowRepository.createQueryBuilder.mock.results[0].value;
			expect(queryBuilder.where).toHaveBeenCalledWith('shared.projectId IN (:...projectIds)', {
				projectIds: ['project-1'],
			});
		});
		it('should handle export errors and cleanup partial files', async () => {
			mockWorkflowRepository.createQueryBuilder.mockImplementation(() => {
				throw new Error('Database connection failed');
			});
			await expect(migrationService.exportInstance(mockUser, mockExportRequest)).rejects.toThrow(
				internal_server_error_1.InternalServerError,
			);
			expect(mockLogger.error).toHaveBeenCalledWith(
				'Instance export failed',
				expect.objectContaining({
					exportId: expect.any(String),
					userId: mockUser.id,
					error: 'Database connection failed',
				}),
			);
			expect(mockEventService.emit).toHaveBeenCalledWith(
				'migration-export-failed',
				expect.objectContaining({
					exportId: expect.any(String),
					userId: mockUser.id,
					error: 'Database connection failed',
				}),
			);
		});
		it('should sanitize credential data based on includeCredentialData flag', async () => {
			const requestWithCredentialData = { ...mockExportRequest, includeCredentialData: true };
			const requestWithoutCredentialData = { ...mockExportRequest, includeCredentialData: false };
			await migrationService.exportInstance(mockUser, requestWithCredentialData);
			await migrationService.exportInstance(mockUser, requestWithoutCredentialData);
			expect(mockCredentialsRepository.createQueryBuilder).toHaveBeenCalledTimes(2);
		});
	});
	describe('importInstance', () => {
		const mockExportData = {
			metadata: {
				id: 'export-1',
				version: '1.0.0',
				createdAt: new Date(),
				source: {
					instanceUrl: 'https://source.example.com',
					n8nVersion: '1.0.0',
				},
			},
			workflows: [
				{
					id: 'workflow-1',
					name: 'Test Workflow',
					nodes: [],
				},
			],
			credentials: [
				{
					id: 'credential-1',
					name: 'Test Credential',
					type: 'httpAuth',
				},
			],
			projects: [
				{
					id: 'project-1',
					name: 'Test Project',
				},
			],
		};
		const mockImportRequest = {
			exportData: mockExportData,
			conflictResolution: 'skip',
			createMissingProjects: true,
		};
		beforeEach(() => {
			mockWorkflowRepository.findOne.mockResolvedValue(null);
			mockCredentialsRepository.findOne.mockResolvedValue(null);
			mockProjectRepository.findOne.mockResolvedValue(null);
			mockUserRepository.findOne.mockResolvedValue(null);
			mockSettingsRepository.findOne.mockResolvedValue(null);
			mockWorkflowRepository.save.mockResolvedValue({});
			mockCredentialsRepository.save.mockResolvedValue({});
			mockProjectRepository.save.mockResolvedValue({});
			mockUserRepository.save.mockResolvedValue({});
			mockSettingsRepository.save.mockResolvedValue({});
		});
		it('should successfully import instance data', async () => {
			const result = await migrationService.importInstance(mockUser, mockImportRequest);
			expect(result).toMatchObject({
				importId: expect.any(String),
				status: 'completed',
				summary: {
					totalImported: 3,
					totalSkipped: 0,
					totalErrors: 0,
					workflows: { imported: 1, skipped: 0, errors: 0 },
					credentials: { imported: 1, skipped: 0, errors: 0 },
					projects: { imported: 1, skipped: 0, errors: 0 },
				},
				completedAt: expect.any(Date),
				sourceMetadata: mockExportData.metadata,
			});
			expect(mockLogger.info).toHaveBeenCalledWith(
				'Starting instance import',
				expect.objectContaining({ importId: expect.any(String), userId: mockUser.id }),
			);
			expect(mockLogger.info).toHaveBeenCalledWith(
				'Instance import completed',
				expect.objectContaining({
					importId: expect.any(String),
					summary: expect.any(Object),
					duration: expect.any(Number),
				}),
			);
		});
		it('should handle conflict resolution strategies', async () => {
			mockWorkflowRepository.findOne.mockResolvedValue({ id: 'existing', name: 'Test Workflow' });
			const skipRequest = { ...mockImportRequest, conflictResolution: 'skip' };
			const renameRequest = { ...mockImportRequest, conflictResolution: 'rename' };
			const skipResult = await migrationService.importInstance(mockUser, skipRequest);
			expect(skipResult.summary.workflows.skipped).toBe(1);
			jest.clearAllMocks();
			mockWorkflowRepository.findOne.mockResolvedValue({ id: 'existing', name: 'Test Workflow' });
			const renameResult = await migrationService.importInstance(mockUser, renameRequest);
			expect(renameResult.summary.workflows.imported).toBe(1);
			expect(mockWorkflowRepository.save).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'Test Workflow (imported)',
				}),
			);
		});
		it('should validate export data before importing', async () => {
			const invalidRequest = {
				...mockImportRequest,
				exportData: { invalid: 'data' },
			};
			await expect(migrationService.importInstance(mockUser, invalidRequest)).rejects.toThrow(
				bad_request_error_1.BadRequestError,
			);
		});
		it('should handle import errors gracefully', async () => {
			mockProjectRepository.save.mockRejectedValue(new Error('Database constraint violation'));
			await expect(migrationService.importInstance(mockUser, mockImportRequest)).rejects.toThrow(
				internal_server_error_1.InternalServerError,
			);
			expect(mockLogger.error).toHaveBeenCalledWith(
				'Instance import failed',
				expect.objectContaining({
					importId: expect.any(String),
					error: 'Database constraint violation',
				}),
			);
		});
	});
	describe('getOperationStatus', () => {
		it('should return operation status for valid user', async () => {
			const exportRequest = {
				includeWorkflows: true,
				includeCredentials: false,
				includeUsers: false,
				includeSettings: false,
			};
			const mockQueryBuilder = {
				leftJoinAndSelect: jest.fn().mockReturnThis(),
				where: jest.fn().mockReturnThis(),
				getMany: jest.fn().mockResolvedValue([]),
			};
			mockWorkflowRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
			mockTagRepository.find.mockResolvedValue([]);
			mockVariablesRepository.find.mockResolvedValue([]);
			const exportResult = await migrationService.exportInstance(mockUser, exportRequest);
			const status = await migrationService.getOperationStatus(mockUser, exportResult.exportId);
			expect(status).toMatchObject({
				id: exportResult.exportId,
				type: 'export',
				status: 'completed',
				progress: 100,
				startedAt: expect.any(Date),
				completedAt: expect.any(Date),
			});
		});
		it('should deny access to operations from other users', async () => {
			const otherUser = { ...mockUser, id: 'other-user', role: 'global:member' };
			await expect(migrationService.getOperationStatus(otherUser, 'non-existent')).rejects.toThrow(
				not_found_error_1.NotFoundError,
			);
		});
		it('should allow global owners to access any operation', async () => {
			const globalOwner = { ...mockUser, role: 'global:owner' };
			await expect(
				migrationService.getOperationStatus(globalOwner, 'non-existent'),
			).rejects.toThrow(not_found_error_1.NotFoundError);
		});
	});
	describe('validateMigration', () => {
		const mockExportData = {
			metadata: {
				source: {
					n8nVersion: '1.0.0',
				},
			},
			workflows: [{ name: 'Test Workflow' }],
		};
		beforeEach(() => {
			process.env.N8N_VERSION = '1.1.0';
			mockWorkflowRepository.findOne.mockResolvedValue(null);
		});
		it('should validate export data and return warnings for version mismatch', async () => {
			const result = await migrationService.validateMigration(mockUser, {
				exportData: mockExportData,
			});
			expect(result.isValid).toBe(true);
			expect(result.warnings).toHaveLength(1);
			expect(result.warnings[0]).toMatchObject({
				code: 'VERSION_MISMATCH',
				message: expect.stringContaining('version 1.0.0'),
			});
			expect(result.compatibility.version).toBe('warning');
		});
		it('should detect resource conflicts', async () => {
			mockWorkflowRepository.findOne.mockResolvedValue({ id: 'existing', name: 'Test Workflow' });
			const result = await migrationService.validateMigration(mockUser, {
				exportData: mockExportData,
			});
			expect(result.warnings).toContainEqual(
				expect.objectContaining({
					code: 'RESOURCE_CONFLICT',
					message: 'workflow "Test Workflow" already exists',
				}),
			);
		});
		it('should validate target instance URL', async () => {
			const result = await migrationService.validateMigration(mockUser, {
				targetInstanceUrl: 'https://target.example.com',
			});
			expect(result.recommendations).toContainEqual(
				expect.objectContaining({
					code: 'TARGET_VALIDATION',
					message: expect.stringContaining('target.example.com'),
				}),
			);
		});
		it('should handle invalid target URLs', async () => {
			const result = await migrationService.validateMigration(mockUser, {
				targetInstanceUrl: 'invalid-url',
			});
			expect(result.isValid).toBe(false);
			expect(result.errors).toContainEqual(
				expect.objectContaining({
					code: 'INVALID_TARGET_URL',
					message: 'Target instance URL is not valid',
				}),
			);
		});
	});
	describe('listExports', () => {
		it('should return list of exports for the user', async () => {
			const exportRequest = {
				includeWorkflows: true,
				includeCredentials: false,
				includeUsers: false,
				includeSettings: false,
			};
			const mockQueryBuilder = {
				leftJoinAndSelect: jest.fn().mockReturnThis(),
				where: jest.fn().mockReturnThis(),
				getMany: jest.fn().mockResolvedValue([]),
			};
			mockWorkflowRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
			mockTagRepository.find.mockResolvedValue([]);
			mockVariablesRepository.find.mockResolvedValue([]);
			await migrationService.exportInstance(mockUser, exportRequest);
			const result = await migrationService.listExports(mockUser);
			expect(result.exports).toHaveLength(1);
			expect(result.total).toBe(1);
			expect(result.exports[0]).toMatchObject({
				id: expect.any(String),
				createdAt: expect.any(Date),
				createdBy: mockUser.id,
				status: 'completed',
			});
		});
		it('should filter exports by user unless global owner', async () => {
			const otherUser = { ...mockUser, id: 'other-user' };
			const result = await migrationService.listExports(otherUser);
			expect(result.exports).toHaveLength(0);
			expect(result.total).toBe(0);
		});
	});
});
//# sourceMappingURL=migration.service.test.js.map
