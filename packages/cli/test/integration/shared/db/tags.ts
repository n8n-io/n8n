import { Container } from '@n8n/di';
import type { IWorkflowBase } from 'n8n-workflow';

import type { TagEntity } from '@/databases/entities/tag-entity';
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
