import Container from 'typedi';
import type { TagEntity } from '@db/entities/TagEntity';
import type { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { TagRepository } from '@db/repositories/tag.repository';
import { WorkflowTagMappingRepository } from '@db/repositories/workflowTagMapping.repository';
import { generateNanoId } from '@db/utils/generators';

import { randomName } from '../random';

export async function createTag(attributes: Partial<TagEntity> = {}, workflow?: WorkflowEntity) {
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
