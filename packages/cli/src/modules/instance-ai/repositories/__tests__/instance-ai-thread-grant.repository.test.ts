import type { InsertQueryBuilder } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import type { InstanceAiThreadGrant } from '../../entities/instance-ai-thread-grant.entity';
import { InstanceAiThreadGrantRepository } from '../instance-ai-thread-grant.repository';

function buildRepo() {
	return Object.create(
		InstanceAiThreadGrantRepository.prototype,
	) as InstanceAiThreadGrantRepository;
}

describe('InstanceAiThreadGrantRepository', () => {
	describe('grant', () => {
		it('inserts the grant and ignores duplicates', async () => {
			const repo = buildRepo();
			const qb = mock<InsertQueryBuilder<InstanceAiThreadGrant>>();
			qb.insert.mockReturnThis();
			qb.values.mockReturnThis();
			qb.orIgnore.mockReturnThis();
			repo.createQueryBuilder = vi.fn().mockReturnValue(qb);

			await repo.grant('thread-1', 'user-1', 'executions:run');

			expect(qb.values).toHaveBeenCalledWith({
				threadId: 'thread-1',
				userId: 'user-1',
				grantKey: 'executions:run',
			});
			expect(qb.orIgnore).toHaveBeenCalled();
			expect(qb.execute).toHaveBeenCalled();
		});
	});

	describe('findKeys', () => {
		it('returns the grant keys for the thread/user as a set', async () => {
			const repo = buildRepo();
			repo.find = vi
				.fn()
				.mockResolvedValue([{ grantKey: 'executions:run' }, { grantKey: 'domain:example.com' }]);

			const keys = await repo.findKeys('thread-1', 'user-1');

			expect(repo.find).toHaveBeenCalledWith({
				where: { threadId: 'thread-1', userId: 'user-1' },
				select: ['grantKey'],
			});
			expect(keys).toEqual(new Set(['executions:run', 'domain:example.com']));
		});
	});
});
