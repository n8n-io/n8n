import { Container } from '@n8n/di';
import type { SelectQueryBuilder } from '@n8n/typeorm';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { TagEntity } from '../../entities';
import { TransactionRunner } from '../../services/transaction';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { TagRepository } from '../tag.repository';

describe('TagRepository', () => {
	mockEntityManager(TagEntity);
	Container.set(TransactionRunner, mock<TransactionRunner>());
	const tagRepository = Container.get(TagRepository);

	let queryBuilder: Mocked<SelectQueryBuilder<TagEntity>>;

	beforeEach(() => {
		vi.restoreAllMocks();

		queryBuilder = mock<SelectQueryBuilder<TagEntity>>();
		queryBuilder.select.mockReturnThis();
		queryBuilder.orderBy.mockReturnThis();
		queryBuilder.limit.mockReturnThis();
		queryBuilder.loadRelationCountAndMap.mockReturnThis();
		vi.spyOn(tagRepository, 'createQueryBuilder').mockReturnValue(queryBuilder);
	});

	describe('findAllWithUsageCount', () => {
		it('selects fields and maps the non-archived usage count', async () => {
			queryBuilder.getMany.mockResolvedValue([]);

			await tagRepository.findAllWithUsageCount({});

			expect(tagRepository.createQueryBuilder).toHaveBeenCalledWith('tag');
			expect(queryBuilder.select).toHaveBeenCalledWith([
				'tag.id',
				'tag.name',
				'tag.createdAt',
				'tag.updatedAt',
			]);
			expect(queryBuilder.loadRelationCountAndMap).toHaveBeenCalledWith(
				'tag.usageCount',
				'tag.workflowMappings',
				'wm',
				expect.any(Function),
			);
			expect(queryBuilder.loadRelationCountAndMap).toHaveBeenCalledWith(
				'tag.agentUsageCount',
				'tag.agentMappings',
				'am',
			);

			// The usage-count sub-query must exclude archived workflows — invoke the
			// callback passed to loadRelationCountAndMap against a mock sub-query
			// builder to prove it, rather than merely asserting a function was passed.
			const usageCountCallback = queryBuilder.loadRelationCountAndMap.mock.calls[0][3] as (
				qb: SelectQueryBuilder<TagEntity>,
			) => SelectQueryBuilder<TagEntity>;
			const subQueryBuilder = mock<SelectQueryBuilder<TagEntity>>();
			subQueryBuilder.leftJoin.mockReturnThis();
			subQueryBuilder.where.mockReturnThis();

			usageCountCallback(subQueryBuilder);

			expect(subQueryBuilder.leftJoin).toHaveBeenCalledWith('wm.workflows', 'workflow');
			expect(subQueryBuilder.where).toHaveBeenCalledWith('workflow.isArchived = :isArchived', {
				isArchived: false,
			});

			expect(queryBuilder.orderBy).not.toHaveBeenCalled();
			expect(queryBuilder.limit).not.toHaveBeenCalled();
		});

		it('sums the workflow and agent counts into one usageCount', async () => {
			queryBuilder.getMany.mockResolvedValue([
				{ id: 'tag-1', name: 'one', usageCount: 2, agentUsageCount: 1 },
			] as never);

			const [tag] = await tagRepository.findAllWithUsageCount({});

			expect(tag.usageCount).toBe(3);
			expect(tag).not.toHaveProperty('agentUsageCount');
		});

		it('orders by name and limits when requested', async () => {
			queryBuilder.getMany.mockResolvedValue([]);

			await tagRepository.findAllWithUsageCount({ orderByName: true, limit: 10 });

			expect(queryBuilder.orderBy).toHaveBeenCalledWith('tag.name', 'ASC');
			expect(queryBuilder.limit).toHaveBeenCalledWith(10);
		});
	});
});
