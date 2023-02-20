import type { FindManyOptions } from 'typeorm';
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