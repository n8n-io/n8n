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

			// Mock service method - now uses transaction-based approach
			mockImportService.importEntities.mockResolvedValue(undefined);

			await command.run();

			// Verify service call with transaction-based approach
			expect(mockImportService.importEntities).toHaveBeenCalledWith('./outputs', false);
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

			mockImportService.importEntities.mockResolvedValue(undefined);

			await command.run();

			expect(mockImportService.importEntities).toHaveBeenCalledWith('/custom/path', false);
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

			mockImportService.importEntities.mockResolvedValue(undefined);

			await command.run();

			// Verify service call with truncation enabled
			expect(mockImportService.importEntities).toHaveBeenCalledWith('./outputs', true);
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

			mockImportService.importEntities.mockRejectedValue(new Error('Database connection failed'));

			await expect(command.run()).rejects.toThrow('Database connection failed');

			// Verify service was called
			expect(mockImportService.importEntities).toHaveBeenCalledWith('./outputs', false);
		});

		it('should handle import errors with transactions', async () => {
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

			mockImportService.importEntities.mockRejectedValue(new Error('Transaction failed'));

			await expect(command.run()).rejects.toThrow('Transaction failed');

			// Verify service was called with truncation enabled
			expect(mockImportService.importEntities).toHaveBeenCalledWith('./outputs', true);
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
