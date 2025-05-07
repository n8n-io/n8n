import type { MockedNodeItem, TestDefinition } from '@n8n/db';
import { AnnotationTagRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { TestDefinitionRepository } from '@/databases/repositories/test-definition.repository.ee';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { validateEntity } from '@/generic-helpers';
import type { ListQuery } from '@/requests';
import { Telemetry } from '@/telemetry';

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
		private telemetry: Telemetry,
	) {}

	private toEntityLike(attrs: {
		name?: string;
		description?: string;
		workflowId?: string;
		evaluationWorkflowId?: string;
		annotationTagId?: string;
		id?: string;
		mockedNodes?: MockedNodeItem[];
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

		if (attrs.mockedNodes) {
			entity.mockedNodes = attrs.mockedNodes;
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
		const existingTestDefinition = await this.testDefinitionRepository.findOneOrFail({
			where: {
				id,
			},
			relations: ['workflow'],
		});

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

		// If there are mocked nodes, validate them
		if (attrs.mockedNodes && attrs.mockedNodes.length > 0) {
			const existingNodeNames = new Map(
				existingTestDefinition.workflow.nodes.map((n) => [n.name, n]),
			);
			const existingNodeIds = new Map(existingTestDefinition.workflow.nodes.map((n) => [n.id, n]));

			// If some node was previously mocked and then removed from the workflow, it should be removed from the mocked nodes
			attrs.mockedNodes = attrs.mockedNodes.filter(
				(node) => existingNodeIds.has(node.id) || (node.name && existingNodeNames.has(node.name)),
			);

			// Update the node names OR node ids if they are not provided
			attrs.mockedNodes = attrs.mockedNodes.map((node) => {
				return {
					id: node.id ?? (node.name && existingNodeNames.get(node.name)?.id),
					name: node.name ?? (node.id && existingNodeIds.get(node.id)?.name),
				};
			});
		}

		// Update the test definition
		const queryResult = await this.testDefinitionRepository.update(id, this.toEntityLike(attrs));

		if (queryResult.affected === 0) {
			throw new NotFoundError('Test definition not found');
		}

		// Send the telemetry events
		if (attrs.annotationTagId && attrs.annotationTagId !== existingTestDefinition.annotationTagId) {
			this.telemetry.track('User added tag to test', {
				test_id: id,
				tag_id: attrs.annotationTagId,
			});
		}

		if (
			attrs.evaluationWorkflowId &&
			existingTestDefinition.evaluationWorkflowId !== attrs.evaluationWorkflowId
		) {
			this.telemetry.track('User added evaluation workflow to test', {
				test_id: id,
				subworkflow_id: attrs.evaluationWorkflowId,
			});
		}
	}

	async delete(id: string, accessibleWorkflowIds: string[]) {
		const deleteResult = await this.testDefinitionRepository.deleteById(id, accessibleWorkflowIds);

		if (deleteResult.affected === 0) {
			throw new NotFoundError('Test definition not found');
		}

		this.telemetry.track('User deleted a test', { test_id: id });
	}

	async getMany(options: ListQuery.Options, accessibleWorkflowIds: string[] = []) {
		return await this.testDefinitionRepository.getMany(accessibleWorkflowIds, options);
	}
}
