import type { DeleteResult, FindManyOptions, UpdateResult } from 'typeorm';
import { TagEntity } from '@db/entities/TagEntity';

import * as Db from '@/Db';

export async function getTags(
	options: FindManyOptions<TagEntity>,
): Promise<TagEntity[]> {
	return Db.collections.Tag.find(options);
}

export async function getTagsCount(options: FindManyOptions<TagEntity>): Promise<number> {
	return Db.collections.Tag.count(options);
}

export async function getTagById(id: string): Promise<TagEntity | null> {
	return Db.collections.Tag.findOne({
		where: { id },
	});
}

export async function createTag(
	tag: TagEntity,
): Promise<TagEntity> {
		return await Db.collections.Tag.save(tag);
}

export async function updateTag(
	id: string,
	tag: TagEntity,
): Promise<UpdateResult> {
		return await Db.collections.Tag.update(id, tag);
}

export async function deleteTag(
	id: string,
): Promise<DeleteResult> {
		return await Db.collections.Tag.delete({ id });
}