import type { FindManyOptions, FindOptionsWhere } from '@n8n/typeorm';
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

		const findManyOptions: FindManyOptions<TestEntity> = {
			where,
			relations: ['annotationTag'],
			order: { createdAt: 'DESC' },
		};

		if (options?.take) {
			findManyOptions.skip = options.skip;
			findManyOptions.take = options.take;
		}

		const [tests, count] = await this.findAndCount(findManyOptions);

		return { tests, count };
	}

	async getOne(id: number, sharedWorkflowIds: string[]) {
		return await this.findOne({
			where: {
				id,
				workflow: {
					id: In(sharedWorkflowIds),
				},
			},
			relations: ['annotationTag'],
		});
	}

	async deleteById(id: number, sharedWorkflowIds: string[]) {
		return await this.delete({
			id,
			workflow: {
				id: In(sharedWorkflowIds),
			},
		});
	}
}
