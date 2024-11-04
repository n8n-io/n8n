import type { FindManyOptions, FindOptionsSelect, FindOptionsWhere } from '@n8n/typeorm';
import { DataSource, In, Repository } from '@n8n/typeorm';
import { Service } from 'typedi';

import { TestEntity } from '@/databases/entities/test-entity';
import type { ListQuery } from '@/requests';

@Service()
export class TestRepository extends Repository<TestEntity> {
	constructor(dataSource: DataSource) {
		super(TestEntity, dataSource.manager);
	}

	async getMany(sharedWorkflowIds: string[], options?: ListQuery.Options) {
		if (sharedWorkflowIds.length === 0) return { tests: [], count: 0 };

		const where: FindOptionsWhere<TestEntity> = {
			...options?.filter,
			workflow: {
				id: In(sharedWorkflowIds),
			},
		};

		type Select = FindOptionsSelect<TestEntity>;

		const select: Select = {
			id: true,
			name: true,
			createdAt: true,
			updatedAt: true,
		};

		const relations: string[] = ['workflow', 'evaluationWorkflow', 'annotationTag'];

		const isDefaultSelect = options?.select === undefined;

		const findManyOptions: FindManyOptions<TestEntity> = {
			select: { ...select, id: true },
			where,
		};

		if (isDefaultSelect || options?.select?.updatedAt === true) {
			findManyOptions.order = { updatedAt: 'ASC' };
		}

		if (relations.length > 0) {
			findManyOptions.relations = relations;
		}

		if (options?.take) {
			findManyOptions.skip = options.skip;
			findManyOptions.take = options.take;
		}

		const [tests, count] = await this.findAndCount(findManyOptions);

		return { tests, count };
	}
}
