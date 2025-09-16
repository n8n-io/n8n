import { ExportEntitiesCommand } from '../entities';
import { ensureDir } from 'fs-extra';

jest.mock('fs-extra');

describe('ExportEntitiesCommand', () => {
	describe('run', () => {
		it('should export entities', () => {
			const command = new ExportEntitiesCommand();
			command.run();

			expect(ensureDir).toHaveBeenCalledWith('./exports');
			// @ts-expect-error Protected property
			expect(command.logger.info).toHaveBeenCalledWith('✅ Task completed successfully! \n');
			// @ts-expect-error Protected property
			expect(command.logger.info).toHaveBeenCalledWith('📁 Output directory: ./exports');
			// @ts-expect-error Protected property
			expect(command.logger.info).toHaveBeenCalledWith('🚀 Starting entity export...');
			// @ts-expect-error Protected property
			expect(command.logger.error).not.toHaveBeenCalled();
		});
	});

	describe('catch', () => {
		it('should log error', () => {
			const command = new ExportEntitiesCommand();
			command.catch(new Error('test'));

			// @ts-expect-error Protected property
			expect(command.logger.error).toHaveBeenCalledWith(
				'❌ Error exporting entities. See log messages for details. \n',
			);
			// @ts-expect-error Protected property
			expect(command.logger.error).toHaveBeenCalledWith('Error details:');
			// @ts-expect-error Protected property
			expect(command.logger.error).toHaveBeenCalledWith('====================================');
			// @ts-expect-error Protected property
			expect(command.logger.error).toHaveBeenCalledWith('test');
		});
	});
});
