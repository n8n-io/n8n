import type { DeleteResult, FindManyOptions, UpdateResult } from 'typeorm';
import { TagEntity } from '@db/entities/TagEntity';

import Container from 'typedi';
import { TagRepository } from '@db/repositories/tag.repository';

export async function getTags(
	options: FindManyOptions<TagEntity>,
): Promise<TagEntity[]> {
	return Container.get(TagRepository).find(options);
}

export async function getTagsCount(options: FindManyOptions<TagEntity>): Promise<number> {
	return Container.get(TagRepository).count(options);
}

export async function getTagById(id: string): Promise<TagEntity | null> {
	return Container.get(TagRepository).findOne({
		where: { id },
	});
}

export async function createTag(
	tag: TagEntity,
): Promise<TagEntity> {
		return await Container.get(TagRepository).save(tag);
}

export async function updateTag(
	id: string,
	tag: TagEntity,
): Promise<UpdateResult> {
		return await Container.get(TagRepository).update(id, tag);
}

export async function deleteTag(
	id: string,
): Promise<DeleteResult> {
		return await Container.get(TagRepository).delete({ id });
}