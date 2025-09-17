import { ExportEntitiesCommand } from '../entities';
import { ensureDir } from 'fs-extra';

jest.mock('fs-extra');

describe('ExportEntitiesCommand', () => {
	describe('run', () => {
		it('should export entities', async () => {
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

			expect(ensureDir).toHaveBeenCalledWith('./exports');
			// @ts-expect-error Protected property
			expect(command.logger.info).toHaveBeenCalledTimes(4);
			// @ts-expect-error Protected property
			expect(command.logger.error).not.toHaveBeenCalled();
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
