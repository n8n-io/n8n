import type { DataSource, SelectQueryBuilder } from '@n8n/typeorm';
import type { Mocked } from 'vitest';

import { WorkflowHistory, WorkflowPublishHistory } from '../../entities';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { WorkflowPublishHistoryRepository } from '../workflow-publish-history.repository';

describe('WorkflowPublishHistoryRepository', () => {
	const entityManager = mockEntityManager(WorkflowPublishHistory);
	const repository = new WorkflowPublishHistoryRepository(
		entityManager.connection as unknown as DataSource,
	);

	let queryBuilder: Mocked<SelectQueryBuilder<WorkflowHistory>>;

	beforeEach(() => {
		vi.resetAllMocks();

		queryBuilder = {
			innerJoin: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			andWhere: vi.fn().mockReturnThis(),
			orderBy: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			take: vi.fn().mockReturnThis(),
			getOne: vi.fn(),
		} as unknown as Mocked<SelectQueryBuilder<WorkflowHistory>>;
	});

	it('limits activation reads to the requested versions and newest history row', async () => {
		const older = Object.assign(new WorkflowHistory(), {
			versionId: 'version-1',
			createdAt: new Date('2026-01-01T00:00:00.000Z'),
		});
		const newer = Object.assign(new WorkflowHistory(), {
			versionId: 'version-2',
			createdAt: new Date('2026-01-02T00:00:00.000Z'),
		});
		const newestActivated = Object.assign(new WorkflowHistory(), {
			versionId: 'version-3',
			createdAt: new Date('2026-01-03T00:00:00.000Z'),
		});
		entityManager.find.mockResolvedValueOnce([older, newer]);
		entityManager.find.mockResolvedValueOnce([
			Object.assign(new WorkflowPublishHistory(), { versionId: 'version-1' }),
		]);
		entityManager.createQueryBuilder.mockReturnValue(queryBuilder);
		queryBuilder.getOne.mockResolvedValue(newestActivated);

		const states = await repository.getVersionPublicationStates('workflow-1', [
			'version-1',
			'version-2',
		]);

		expect(entityManager.find).toHaveBeenCalledWith(WorkflowPublishHistory, {
			where: {
				workflowId: 'workflow-1',
				versionId: expect.objectContaining({ _value: ['version-1', 'version-2'] }),
				event: 'activated',
			},
			select: ['versionId'],
		});
		expect(entityManager.createQueryBuilder).toHaveBeenCalledWith(WorkflowHistory, 'history');
		expect(queryBuilder.innerJoin).toHaveBeenCalledWith(
			WorkflowPublishHistory,
			'publishHistory',
			'publishHistory.workflowId = history.workflowId AND publishHistory.versionId = history.versionId',
		);
		expect(queryBuilder.orderBy).toHaveBeenCalledWith('history.createdAt', 'DESC');
		expect(queryBuilder.take).toHaveBeenCalledWith(1);
		expect(states).toEqual(
			new Map([
				['version-1', 'published'],
				['version-2', 'superseded'],
			]),
		);
	});
});
