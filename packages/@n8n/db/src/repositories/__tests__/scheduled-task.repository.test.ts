import { Container } from '@n8n/di';
import { In } from '@n8n/typeorm';

import { ScheduledTask, ScheduledTaskStatus } from '../../entities';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { ScheduledTaskRepository } from '../scheduled-task.repository';

describe('ScheduledTaskRepository', () => {
	const entityManager = mockEntityManager(ScheduledTask);
	// The constructor escapes identifiers through the driver; the mock has none, so stub it.
	(entityManager.connection as unknown as { driver: { escape: (id: string) => string } }).driver = {
		escape: (identifier) => `"${identifier}"`,
	};
	const repository = Container.get(ScheduledTaskRepository);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('deletePendingByJobIds', () => {
		it('deletes only the pending tasks of the given jobs', async () => {
			await repository.deletePendingByJobIds(entityManager, [1, 2]);

			expect(entityManager.delete).toHaveBeenCalledWith(ScheduledTask, {
				jobId: In([1, 2]),
				status: ScheduledTaskStatus.Pending,
			});
		});

		it('is a no-op when there are no job ids', async () => {
			await repository.deletePendingByJobIds(entityManager, []);

			expect(entityManager.delete).not.toHaveBeenCalled();
		});
	});
});
