import { Service } from '@n8n/di';
import type { FindManyOptions } from '@n8n/typeorm';
import { DataSource, Repository } from '@n8n/typeorm';

import type { AggregatedTestRunMetrics } from '@/databases/entities/test-run.ee';
import { TestRun } from '@/databases/entities/test-run.ee';
import type { ListQuery } from '@/requests';

@Service()
export class TestRunRepository extends Repository<TestRun> {
	constructor(dataSource: DataSource) {
		super(TestRun, dataSource.manager);
	}

	async createTestRun(testDefinitionId: string) {
		const testRun = this.create({
			status: 'new',
			testDefinition: { id: testDefinitionId },
		});

		return await this.save(testRun);
	}

	async markAsRunning(id: string, totalCases: number) {
		return await this.update(id, {
			status: 'running',
			runAt: new Date(),
			totalCases,
			passedCases: 0,
			failedCases: 0,
		});
	}

	async markAsCompleted(id: string, metrics: AggregatedTestRunMetrics) {
		return await this.update(id, { status: 'completed', completedAt: new Date(), metrics });
	}

	async markAsCancelled(id: string) {
		return await this.update(id, { status: 'cancelled' });
	}

	async incrementPassed(id: string) {
		return await this.increment({ id }, 'passedCases', 1);
	}

	async incrementFailed(id: string) {
		return await this.increment({ id }, 'failedCases', 1);
	}

	async getMany(testDefinitionId: string, options: ListQuery.Options) {
		const findManyOptions: FindManyOptions<TestRun> = {
			where: { testDefinition: { id: testDefinitionId } },
			order: { createdAt: 'DESC' },
		};

		if (options?.take) {
			findManyOptions.skip = options.skip;
			findManyOptions.take = options.take;
		}

		return await this.find(findManyOptions);
	}
}
