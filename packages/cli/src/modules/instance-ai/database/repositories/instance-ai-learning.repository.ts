import { Service } from '@n8n/di';
import { DataSource, In, Repository } from '@n8n/typeorm';

import { InstanceAiLearning } from '../entities/instance-ai-learning.entity';

@Service()
export class InstanceAiLearningRepository extends Repository<InstanceAiLearning> {
	constructor(dataSource: DataSource) {
		super(InstanceAiLearning, dataSource.manager);
	}

	async findByProjectId(
		projectId: string,
		options: { query?: string; reviewStatus?: InstanceAiLearning['reviewStatus'] } = {},
	) {
		const queryBuilder = this.createQueryBuilder('learning')
			.where('learning.projectId = :projectId', { projectId })
			.orderBy('learning.createdAt', 'DESC');

		if (options.reviewStatus) {
			queryBuilder.andWhere('learning.reviewStatus = :reviewStatus', {
				reviewStatus: options.reviewStatus,
			});
		}

		const query = options.query?.trim().toLowerCase();
		if (query) {
			queryBuilder.andWhere(
				'(LOWER(learning.statement) LIKE :query OR LOWER(learning.appliesWhen) LIKE :query)',
				{ query: `%${query}%` },
			);
		}

		return await queryBuilder.getMany();
	}

	async findByIdAndProjectId(id: string, projectId: string) {
		return await this.findOneBy({ id, projectId });
	}

	async findApprovedEnabled(projectId: string) {
		return await this.find({
			where: { projectId, reviewStatus: 'approved', enabled: true },
			order: { confidence: 'DESC', createdAt: 'DESC' },
		});
	}

	async findApprovedEnabledByIds(projectId: string, ids: string[]) {
		if (ids.length === 0) return [];
		return await this.find({
			where: {
				id: In(ids),
				projectId,
				reviewStatus: 'approved',
				enabled: true,
			},
		});
	}
}
