import { Service } from 'typedi';

import type { TestEntity } from '@/databases/entities/test-entity';
import type { User } from '@/databases/entities/user';
import { TestRepository } from '@/databases/repositories/test.repository';
import { validateEntity } from '@/generic-helpers';
import type { ListQuery } from '@/requests';
import { WorkflowSharingService } from '@/workflows/workflow-sharing.service';

@Service()
export class TestsService {
	constructor(
		private testRepository: TestRepository,
		private readonly workflowSharingService: WorkflowSharingService,
	) {}

	// toEntity(attrs: { name: string; id?: string }) {
	// 	attrs.name = attrs.name.trim();
	//
	// 	return this.testRepository.create(attrs);
	// }

	async save(test: TestEntity) {
		await validateEntity(test);

		return await this.testRepository.save(test);
	}

	async delete(id: string) {
		return await this.testRepository.delete(id);
	}

	async getMany(user: User, options: ListQuery.Options) {
		const sharedWorkflowIds = await this.workflowSharingService.getSharedWorkflowIds(user, {
			scopes: ['workflow:read'],
		});

		return await this.testRepository.getMany(sharedWorkflowIds, options);
	}
}
