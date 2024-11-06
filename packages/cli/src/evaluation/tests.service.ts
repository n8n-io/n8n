import { Service } from 'typedi';

import type { TestDefinition } from '@/databases/entities/test-definition';
import type { User } from '@/databases/entities/user';
import { TestRepository } from '@/databases/repositories/test.repository';
import { validateEntity } from '@/generic-helpers';
import type { ListQuery } from '@/requests';

type TestDefinitionLike = Omit<
	Partial<TestDefinition>,
	'workflow' | 'evaluationWorkflow' | 'annotationTag'
> & {
	workflow?: { id: string };
	evaluationWorkflow?: { id: string };
	annotationTag?: { id: string };
};

@Service()
export class TestsService {
	constructor(private testRepository: TestRepository) {}

	toEntity(attrs: {
		name?: string;
		workflowId?: string;
		evaluationWorkflowId?: string;
		annotationTagId?: string;
		id?: number;
	}) {
		const entity: TestDefinitionLike = {
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

		if (attrs.annotationTagId) {
			entity.annotationTag = {
				id: attrs.annotationTagId,
			};
		}

		return this.testRepository.create(entity);
	}

	async findOne(id: number, accessibleWorkflowIds: string[]) {
		return await this.testRepository.getOne(id, accessibleWorkflowIds);
	}

	async save(test: TestDefinition) {
		await validateEntity(test);

		return await this.testRepository.save(test);
	}

	async delete(id: number, accessibleWorkflowIds: string[]) {
		return await this.testRepository.deleteById(id, accessibleWorkflowIds);
	}

	async getMany(options: ListQuery.Options, accessibleWorkflowIds: string[] = []) {
		return await this.testRepository.getMany(accessibleWorkflowIds, options);
	}
}
