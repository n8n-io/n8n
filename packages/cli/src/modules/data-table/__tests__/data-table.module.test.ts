import { DataTableModule } from '../data-table.module';

describe('DataTableModule', () => {
	describe('systemTasks()', () => {
		it('should return the file cleanup task', async () => {
			const tasks = (await new DataTableModule().systemTasks?.()) ?? [];

			expect(tasks.map((task) => task.name)).toEqual(['DataTableFileCleanupTask']);
		});
	});
});
