import { Service } from 'typedi';

import type { TestDefinition } from '@/databases/entities/test-definition.ee';
import { AnnotationTagRepository } from '@/databases/repositories/annotation-tag.repository.ee';
import { TestDefinitionRepository } from '@/databases/repositories/test-definition.repository.ee';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { validateEntity } from '@/generic-helpers';
import type { ListQuery } from '@/requests';

type TestDefinitionLike = Omit<
	Partial<TestDefinition>,
	'workflow' | 'evaluationWorkflow' | 'annotationTag' | 'metrics'
> & {
	workflow?: { id: string };
	evaluationWorkflow?: { id: string };
	annotationTag?: { id: string };
};

@Service()
export class TestDefinitionService {
	constructor(
		private testDefinitionRepository: TestDefinitionRepository,
		private annotationTagRepository: AnnotationTagRepository,
	) {}

	private toEntityLike(attrs: {
		name?: string;
		description?: string;
		workflowId?: string;
		evaluationWorkflowId?: string;
		annotationTagId?: string;
		id?: string;
	}) {
		const entity: TestDefinitionLike = {};

		if (attrs.id) {
			entity.id = attrs.id;
		}

		if (attrs.name) {
			entity.name = attrs.name?.trim();
		}

		if (attrs.description) {
			entity.description = attrs.description.trim();
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

		return entity;
	}

	toEntity(attrs: {
		name?: string;
		workflowId?: string;
		evaluationWorkflowId?: string;
		annotationTagId?: string;
		id?: string;
	}) {
		const entity = this.toEntityLike(attrs);
		return this.testDefinitionRepository.create(entity);
	}

	async findOne(id: string, accessibleWorkflowIds: string[]) {
		return await this.testDefinitionRepository.getOne(id, accessibleWorkflowIds);
	}

	async save(test: TestDefinition) {
		await validateEntity(test);

		return await this.testDefinitionRepository.save(test);
	}

	async update(id: string, attrs: TestDefinitionLike) {
		if (attrs.name) {
			const updatedTest = this.toEntity(attrs);
			await validateEntity(updatedTest);
		}

		// Check if the annotation tag exists
		if (attrs.annotationTagId) {
			const annotationTagExists = await this.annotationTagRepository.exists({
				where: {
					id: attrs.annotationTagId,
				},
			});

			if (!annotationTagExists) {
				throw new BadRequestError('Annotation tag not found');
			}
		}

		// Update the test definition
		const queryResult = await this.testDefinitionRepository.update(id, this.toEntityLike(attrs));

		if (queryResult.affected === 0) {
			throw new NotFoundError('Test definition not found');
		}
	}

	async delete(id: string, accessibleWorkflowIds: string[]) {
		const deleteResult = await this.testDefinitionRepository.deleteById(id, accessibleWorkflowIds);

		if (deleteResult.affected === 0) {
			throw new NotFoundError('Test definition not found');
		}
	}

	async getMany(options: ListQuery.Options, accessibleWorkflowIds: string[] = []) {
		return await this.testDefinitionRepository.getMany(accessibleWorkflowIds, options);
	}
}
