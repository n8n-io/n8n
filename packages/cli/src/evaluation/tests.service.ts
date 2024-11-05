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

	toEntity(attrs: {
		name?: string;
		workflowId?: string;
		evaluationWorkflowId?: string;
		id?: number;
	}) {
		const entity = {
			name: attrs.name?.trim(),
		};

		if (attrs.id) {
			entity.id = attrs.id;
		}

		if (attrs.workflowId) {
			entity.workflow = {
				id: attrs.workflowId,
			};
		}

		if (attrs.evaluationWorkflowId) {
			entity.evaluationWorkflow = {
				id: attrs.evaluationWorkflowId,
			};
		}

		return this.testRepository.create(entity);
	}

	async findOne(id: number, accessibleWorkflowIds: string[]) {
		return await this.testRepository.getOne(id, accessibleWorkflowIds);
	}

	async save(test: TestEntity) {
		await validateEntity(test);

		return await this.testRepository.save(test);
	}

	async delete(id: number, accessibleWorkflowIds: string[]) {
		return await this.testRepository.deleteById(id, accessibleWorkflowIds);
	}

	async getMany(user: User, options: ListQuery.Options, accessibleWorkflowIds: string[] = []) {
		return await this.testRepository.getMany(accessibleWorkflowIds, options);
	}
}
