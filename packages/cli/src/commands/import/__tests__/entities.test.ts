import { ImportService } from '@/services/import.service';
import { ImportEntitiesCommand } from '../entities';
import { mock } from 'jest-mock-extended';

jest.mock('@/services/import.service', () => ({
	ImportService: mock<ImportService>(),
}));

describe('ImportEntitiesCommand', () => {
	describe('run', () => {
		it('should import entities', async () => {
			const command = new ImportEntitiesCommand();
			// @ts-expect-error Protected property
			command.flags = {
				inputDir: './exports',
			};
			// @ts-expect-error Protected property
			command.logger = {
				info: jest.fn(),
				error: jest.fn(),
			};
			await command.run();

			// @ts-expect-error Protected property
			expect(command.logger.info).toHaveBeenCalledTimes(4);
			// @ts-expect-error Protected property
			expect(command.logger.error).not.toHaveBeenCalled();
		});
	});

	describe('catch', () => {
		it('should log error', () => {
			const command = new ImportEntitiesCommand();
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
