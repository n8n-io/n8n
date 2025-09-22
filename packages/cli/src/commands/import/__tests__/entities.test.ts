import { ImportEntitiesCommand } from '../entities';
import { mockInstance } from '@n8n/backend-test-utils';
import { ImportService } from '@/services/import.service';

jest.mock('@/services/import.service');

describe('ImportEntitiesCommand', () => {
	const mockImportService = mockInstance(ImportService);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('run', () => {
		it('should import entities with default flags', async () => {
			const command = new ImportEntitiesCommand();
			// @ts-expect-error Protected property
			command.flags = {
				inputDir: './outputs',
				truncateTables: false,
			};
			// @ts-expect-error Protected property
			command.logger = {
				info: jest.fn(),
				error: jest.fn(),
			};

			// Mock service methods
			mockImportService.disableForeignKeyConstraints.mockResolvedValue(undefined);
			mockImportService.getTableNamesForImport.mockResolvedValue(['user', 'workflow']);
			mockImportService.areAllEntityTablesEmpty.mockResolvedValue(true);
			mockImportService.importEntitiesFromFiles.mockResolvedValue(undefined);
			mockImportService.enableForeignKeyConstraints.mockResolvedValue(undefined);

			await command.run();

			// Verify service calls
			expect(mockImportService.disableForeignKeyConstraints).toHaveBeenCalled();
			expect(mockImportService.getTableNamesForImport).toHaveBeenCalledWith('./outputs');
			expect(mockImportService.areAllEntityTablesEmpty).toHaveBeenCalledWith(['user', 'workflow']);
			expect(mockImportService.importEntitiesFromFiles).toHaveBeenCalledWith('./outputs');
			expect(mockImportService.enableForeignKeyConstraints).toHaveBeenCalled();
		});

		it('should import entities with custom input directory', async () => {
			const command = new ImportEntitiesCommand();
			// @ts-expect-error Protected property
			command.flags = {
				inputDir: '/custom/path',
				truncateTables: false,
			};
			// @ts-expect-error Protected property
			command.logger = {
				info: jest.fn(),
				error: jest.fn(),
			};

			mockImportService.disableForeignKeyConstraints.mockResolvedValue(undefined);
			mockImportService.getTableNamesForImport.mockResolvedValue(['settings']);
			mockImportService.areAllEntityTablesEmpty.mockResolvedValue(true);
			mockImportService.importEntitiesFromFiles.mockResolvedValue(undefined);
			mockImportService.enableForeignKeyConstraints.mockResolvedValue(undefined);

			await command.run();

			expect(mockImportService.getTableNamesForImport).toHaveBeenCalledWith('/custom/path');
			expect(mockImportService.importEntitiesFromFiles).toHaveBeenCalledWith('/custom/path');
		});

		it('should truncate tables when truncateTables flag is true', async () => {
			const command = new ImportEntitiesCommand();
			// @ts-expect-error Protected property
			command.flags = {
				inputDir: './outputs',
				truncateTables: true,
			};
			// @ts-expect-error Protected property
			command.logger = {
				info: jest.fn(),
				error: jest.fn(),
			};

			mockImportService.disableForeignKeyConstraints.mockResolvedValue(undefined);
			mockImportService.getTableNamesForImport.mockResolvedValue(['user', 'workflow', 'settings']);
			mockImportService.truncateEntityTable.mockResolvedValue(undefined);
			mockImportService.importEntitiesFromFiles.mockResolvedValue(undefined);
			mockImportService.enableForeignKeyConstraints.mockResolvedValue(undefined);

			await command.run();

			// Verify truncation calls
			expect(mockImportService.truncateEntityTable).toHaveBeenCalledWith('user');
			expect(mockImportService.truncateEntityTable).toHaveBeenCalledWith('workflow');
			expect(mockImportService.truncateEntityTable).toHaveBeenCalledWith('settings');
			expect(mockImportService.truncateEntityTable).toHaveBeenCalledTimes(3);

			// Should not check if tables are empty when truncating
			expect(mockImportService.areAllEntityTablesEmpty).not.toHaveBeenCalled();
		});

		it('should skip import when tables are not empty and truncateTables is false', async () => {
			const command = new ImportEntitiesCommand();
			// @ts-expect-error Protected property
			command.flags = {
				inputDir: './outputs',
				truncateTables: false,
			};
			// @ts-expect-error Protected property
			command.logger = {
				info: jest.fn(),
				error: jest.fn(),
			};

			mockImportService.disableForeignKeyConstraints.mockResolvedValue(undefined);
			mockImportService.getTableNamesForImport.mockResolvedValue(['user', 'workflow']);
			mockImportService.areAllEntityTablesEmpty.mockResolvedValue(false);
			mockImportService.enableForeignKeyConstraints.mockResolvedValue(undefined);

			await command.run();

			// Should not import when tables are not empty
			expect(mockImportService.importEntitiesFromFiles).not.toHaveBeenCalled();
		});

		it('should handle empty table names list', async () => {
			const command = new ImportEntitiesCommand();
			// @ts-expect-error Protected property
			command.flags = {
				inputDir: './outputs',
				truncateTables: false,
			};
			// @ts-expect-error Protected property
			command.logger = {
				info: jest.fn(),
				error: jest.fn(),
			};

			mockImportService.disableForeignKeyConstraints.mockResolvedValue(undefined);
			mockImportService.getTableNamesForImport.mockResolvedValue([]);
			mockImportService.areAllEntityTablesEmpty.mockResolvedValue(true);
			mockImportService.importEntitiesFromFiles.mockResolvedValue(undefined);
			mockImportService.enableForeignKeyConstraints.mockResolvedValue(undefined);

			await command.run();

			expect(mockImportService.areAllEntityTablesEmpty).toHaveBeenCalledWith([]);
			expect(mockImportService.importEntitiesFromFiles).toHaveBeenCalledWith('./outputs');
		});

		it('should always enable foreign key constraints in finally block', async () => {
			const command = new ImportEntitiesCommand();
			// @ts-expect-error Protected property
			command.flags = {
				inputDir: './outputs',
				truncateTables: false,
			};
			// @ts-expect-error Protected property
			command.logger = {
				info: jest.fn(),
				error: jest.fn(),
			};

			mockImportService.disableForeignKeyConstraints.mockResolvedValue(undefined);
			mockImportService.getTableNamesForImport.mockResolvedValue(['user']);
			mockImportService.areAllEntityTablesEmpty.mockResolvedValue(true);
			mockImportService.importEntitiesFromFiles.mockRejectedValue(new Error('Import failed'));
			mockImportService.enableForeignKeyConstraints.mockResolvedValue(undefined);

			await expect(command.run()).rejects.toThrow('Import failed');

			// Should still enable foreign key constraints even when import fails
			expect(mockImportService.enableForeignKeyConstraints).toHaveBeenCalled();
		});

		it('should handle service errors gracefully', async () => {
			const command = new ImportEntitiesCommand();
			// @ts-expect-error Protected property
			command.flags = {
				inputDir: './outputs',
				truncateTables: false,
			};
			// @ts-expect-error Protected property
			command.logger = {
				info: jest.fn(),
				error: jest.fn(),
			};

			mockImportService.disableForeignKeyConstraints.mockRejectedValue(
				new Error('Database connection failed'),
			);

			await expect(command.run()).rejects.toThrow('Database connection failed');

			// When disableForeignKeyConstraints fails, the finally block doesn't execute
			// because the call is outside the try block
			expect(mockImportService.enableForeignKeyConstraints).not.toHaveBeenCalled();
		});

		it('should handle truncation errors', async () => {
			const command = new ImportEntitiesCommand();
			// @ts-expect-error Protected property
			command.flags = {
				inputDir: './outputs',
				truncateTables: true,
			};
			// @ts-expect-error Protected property
			command.logger = {
				info: jest.fn(),
				error: jest.fn(),
			};

			mockImportService.disableForeignKeyConstraints.mockResolvedValue(undefined);
			mockImportService.getTableNamesForImport.mockResolvedValue(['user', 'workflow']);
			mockImportService.truncateEntityTable
				.mockResolvedValueOnce(undefined) // First truncation succeeds
				.mockRejectedValueOnce(new Error('Truncation failed')); // Second truncation fails
			mockImportService.enableForeignKeyConstraints.mockResolvedValue(undefined);

			await expect(command.run()).rejects.toThrow('Truncation failed');

			// Should still enable foreign key constraints
			expect(mockImportService.enableForeignKeyConstraints).toHaveBeenCalled();
		});

		it('should handle table emptiness check errors', async () => {
			const command = new ImportEntitiesCommand();
			// @ts-expect-error Protected property
			command.flags = {
				inputDir: './outputs',
				truncateTables: false,
			};
			// @ts-expect-error Protected property
			command.logger = {
				info: jest.fn(),
				error: jest.fn(),
			};

			mockImportService.disableForeignKeyConstraints.mockResolvedValue(undefined);
			mockImportService.getTableNamesForImport.mockResolvedValue(['user']);
			mockImportService.areAllEntityTablesEmpty.mockRejectedValue(
				new Error('Database query failed'),
			);
			mockImportService.enableForeignKeyConstraints.mockResolvedValue(undefined);

			await expect(command.run()).rejects.toThrow('Database query failed');

			// Should still enable foreign key constraints
			expect(mockImportService.enableForeignKeyConstraints).toHaveBeenCalled();
		});
	});

	describe('catch', () => {
		it('should log error details properly', () => {
			const command = new ImportEntitiesCommand();
			// @ts-expect-error Protected property
			command.logger = {
				error: jest.fn(),
			};

			const error = new Error('Test error message');
			command.catch(error);

			// @ts-expect-error Protected property
			expect(command.logger.error).toHaveBeenCalledWith(
				'❌ Error importing entities. See log messages for details. \n',
			);
			// @ts-expect-error Protected property
			expect(command.logger.error).toHaveBeenCalledWith('Error details:');
			// @ts-expect-error Protected property
			expect(command.logger.error).toHaveBeenCalledWith('\n====================================\n');
			// @ts-expect-error Protected property
			expect(command.logger.error).toHaveBeenCalledWith('Test error message \n');
		});

		it('should handle errors without message', () => {
			const command = new ImportEntitiesCommand();
			// @ts-expect-error Protected property
			command.logger = {
				error: jest.fn(),
			};

			const error = new Error();
			command.catch(error);

			// @ts-expect-error Protected property
			expect(command.logger.error).toHaveBeenCalledWith(
				'❌ Error importing entities. See log messages for details. \n',
			);
			// @ts-expect-error Protected property
			expect(command.logger.error).toHaveBeenCalledWith('Error details:');
			// @ts-expect-error Protected property
			expect(command.logger.error).toHaveBeenCalledWith('\n====================================\n');
			// @ts-expect-error Protected property
			expect(command.logger.error).toHaveBeenCalledWith(' \n');
		});

		it('should handle non-Error objects', () => {
			const command = new ImportEntitiesCommand();
			// @ts-expect-error Protected property
			command.logger = {
				error: jest.fn(),
			};

			const error = 'String error';
			command.catch(error as any);

			// @ts-expect-error Protected property
			expect(command.logger.error).toHaveBeenCalledWith(
				'❌ Error importing entities. See log messages for details. \n',
			);
			// @ts-expect-error Protected property
			expect(command.logger.error).toHaveBeenCalledWith('Error details:');
			// @ts-expect-error Protected property
			expect(command.logger.error).toHaveBeenCalledWith('\n====================================\n');
			// @ts-expect-error Protected property
			expect(command.logger.error).toHaveBeenCalledWith('undefined \n');
		});
	});
});
