import type { FindManyOptions, FindOptionsWhere } from '@n8n/typeorm';
import { DataSource, In, Repository } from '@n8n/typeorm';
import { Service } from 'typedi';

import { TestDefinition } from '@/databases/entities/test-definition.ee';
import type { ListQuery } from '@/requests';

@Service()
export class TestDefinitionRepository extends Repository<TestDefinition> {
	constructor(dataSource: DataSource) {
		super(TestDefinition, dataSource.manager);
	}

	async getMany(accessibleWorkflowIds: string[], options?: ListQuery.Options) {
		if (accessibleWorkflowIds.length === 0) return { tests: [], count: 0 };

		const where: FindOptionsWhere<TestDefinition> = {
			...options?.filter,
			workflow: {
				id: In(accessibleWorkflowIds),
			},
		};

		const findManyOptions: FindManyOptions<TestDefinition> = {
			where,
			relations: ['annotationTag'],
			order: { createdAt: 'DESC' },
		};

		if (options?.take) {
			findManyOptions.skip = options.skip;
			findManyOptions.take = options.take;
		}

		const [testDefinitions, count] = await this.findAndCount(findManyOptions);

		return { testDefinitions, count };
	}

	async getOne(id: string, accessibleWorkflowIds: string[]) {
		return await this.findOne({
			where: {
				id,
				workflow: {
					id: In(accessibleWorkflowIds),
				},
			},
			relations: ['annotationTag'],
		});
	}

	async deleteById(id: string, accessibleWorkflowIds: string[]) {
		return await this.delete({
			id,
			workflow: {
				id: In(accessibleWorkflowIds),
			},
		});
	}
}
