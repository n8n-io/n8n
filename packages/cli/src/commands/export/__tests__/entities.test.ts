import { ExportEntitiesCommand } from '../entities';
import { mockInstance } from '@n8n/backend-test-utils';
import { ExportService } from '@/services/export.service';

jest.mock('fs-extra');
jest.mock('@/services/export.service');

describe('ExportEntitiesCommand', () => {
	const mockExportService = mockInstance(ExportService);

	describe('run', () => {
		it('should export entities without large data tables', async () => {
			const command = new ExportEntitiesCommand();
			// @ts-expect-error Protected property
			command.flags = {
				outputDir: './exports',
			};
			// @ts-expect-error Protected property
			command.logger = {
				info: jest.fn(),
				error: jest.fn(),
			};
			await command.run();

			expect(mockExportService.exportEntities).toHaveBeenCalledWith(
				'./exports',
				new Set<string>([
					'execution_annotation_tags',
					'execution_annotations',
					'execution_data',
					'execution_entity',
					'execution_metadata',
				]),
			);
		});

		it('should export entities with large data tables', async () => {
			const command = new ExportEntitiesCommand();
			// @ts-expect-error Protected property
			command.flags = {
				outputDir: './exports',
				includeExecutionHistoryDataTables: true,
			};
			// @ts-expect-error Protected property
			command.logger = {
				info: jest.fn(),
				error: jest.fn(),
			};
			await command.run();

			expect(mockExportService.exportEntities).toHaveBeenCalledWith('./exports', new Set<string>());
		});
	});

	describe('catch', () => {
		it('should log error', () => {
			const command = new ExportEntitiesCommand();
			// @ts-expect-error Protected property
			command.logger = {
				error: jest.fn(),
			};
			command.catch(new Error('test'));

			// @ts-expect-error Protected property
			expect(command.logger.error).toHaveBeenCalled();
		});
	});
});
