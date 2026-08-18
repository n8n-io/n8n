import type { FindManyOptions, FindOperator } from '@n8n/typeorm';

import type { InstanceAiRunSnapshot } from '../../entities/instance-ai-run-snapshot.entity';
import { InstanceAiRunSnapshotRepository } from '../instance-ai-run-snapshot.repository';

/** The `createdAt` operator `findInWindow` built, as {type, value}. */
function createdAtOperator(find: ReturnType<typeof vi.fn>) {
	const options = find.mock.calls[0][0] as FindManyOptions<InstanceAiRunSnapshot>;
	const where = options.where as { createdAt?: FindOperator<Date> };
	const operator = where.createdAt;
	if (!operator) return undefined;
	return { type: operator.type, value: operator.value };
}

describe('InstanceAiRunSnapshotRepository.findInWindow', () => {
	const since = new Date('2026-01-01T00:00:00.000Z');
	const until = new Date('2026-01-02T00:00:00.000Z');

	function createRepo() {
		const repo = Object.create(
			InstanceAiRunSnapshotRepository.prototype,
		) as InstanceAiRunSnapshotRepository;
		const find = vi.fn().mockResolvedValue([]);
		Object.defineProperty(repo, 'find', { value: find, configurable: true });
		return { repo, find };
	}

	it('bounds both sides when the window is closed', async () => {
		const { repo, find } = createRepo();

		await repo.findInWindow('thread-1', { since, until });

		expect(createdAtOperator(find)).toEqual({ type: 'between', value: [since, until] });
	});

	it('bounds only the lower side for the newest page', async () => {
		const { repo, find } = createRepo();

		await repo.findInWindow('thread-1', { since });

		expect(createdAtOperator(find)).toEqual({ type: 'moreThanOrEqual', value: since });
	});

	it('bounds only the upper side when there is no lower bound', async () => {
		const { repo, find } = createRepo();

		await repo.findInWindow('thread-1', { until });

		expect(createdAtOperator(find)).toEqual({ type: 'lessThanOrEqual', value: until });
	});

	it('reads the whole thread for an open window', async () => {
		const { repo, find } = createRepo();

		await repo.findInWindow('thread-1', {});

		expect(createdAtOperator(find)).toBeUndefined();
		expect(find).toHaveBeenCalledWith(expect.objectContaining({ where: { threadId: 'thread-1' } }));
	});
});
