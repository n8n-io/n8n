import { Container } from '@n8n/di';
import type { IWorkflowBase } from 'n8n-workflow';

import type { TagEntity } from '@/databases/entities/tag-entity';
import type { WorkflowEntity } from '@/databases/entities/workflow-entity';
import { TagRepository } from '@/databases/repositories/tag.repository';
import { WorkflowTagMappingRepository } from '@/databases/repositories/workflow-tag-mapping.repository';
import { generateNanoId } from '@/databases/utils/generators';

import { randomName } from '../random';

export async function createTag(attributes: Partial<TagEntity> = {}, workflow?: IWorkflowBase) {
	const { name } = attributes;

	const tag = await Container.get(TagRepository).save({
		id: generateNanoId(),
		name: name ?? randomName(),
		...attributes,
	});

	if (workflow) {
		const mappingRepository = Container.get(WorkflowTagMappingRepository);
		const mapping = mappingRepository.create({ tagId: tag.id, workflowId: workflow.id });
		await mappingRepository.save(mapping);
	}

	return tag;
}

export async function assignTagToWorkflow(tag: TagEntity, workflow: WorkflowEntity) {
	const mappingRepository = Container.get(WorkflowTagMappingRepository);

	// Check if mapping already exists
	const existingMapping = await mappingRepository.findOne({
		where: {
			tagId: tag.id,
			workflowId: workflow.id,
		},
	});

	if (existingMapping) {
		return existingMapping;
	}

	// Create new mapping
	const mapping = mappingRepository.create({
		tagId: tag.id,
		workflowId: workflow.id,
	});

	return await mappingRepository.save(mapping);
}
