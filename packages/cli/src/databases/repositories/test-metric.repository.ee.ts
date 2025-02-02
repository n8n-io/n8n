import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { TestMetric } from '@/databases/entities/test-metric.ee';

@Service()
export class TestMetricRepository extends Repository<TestMetric> {
	constructor(dataSource: DataSource) {
		super(TestMetric, dataSource.manager);
	}
}
