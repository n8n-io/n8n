/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable import/no-cycle */
import { getConnection } from 'typeorm';
import { validate } from 'class-validator';

import { ResponseHelper } from '.';

import { TagEntity } from './databases/entities/TagEntity';

import { ITagWithCountDb } from './Interfaces';

// ----------------------------------
//              utils
// ----------------------------------

/**
 * Sort a `TagEntity[]` by the order of the tag IDs in the incoming request.
 */
export function sortByRequestOrder(tagsDb: TagEntity[], tagIds: string[]) {
	const tagMap = tagsDb.reduce((acc, tag) => {
		// @ts-ignore
		tag.id = tag.id.toString();
		acc[tag.id] = tag;
		return acc;
	}, {} as { [key: string]: TagEntity });

	return tagIds.map((tagId) => tagMap[tagId]);
}

// ----------------------------------
//           validators
// ----------------------------------

/**
 * Validate a new tag based on `class-validator` constraints.
 */
export async function validateTag(newTag: TagEntity) {
	const errors = await validate(newTag);

	if (errors.length) {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const validationErrorMessage = Object.values(errors[0].constraints!)[0];
		throw new ResponseHelper.ResponseError(validationErrorMessage, undefined, 400);
	}
}

export function throwDuplicateEntryError(error: Error) {
	const errorMessage = error.message.toLowerCase();
	if (errorMessage.includes('unique') || errorMessage.includes('duplicate')) {
		throw new ResponseHelper.ResponseError('Tag name already exists', undefined, 400);
	}

	throw new ResponseHelper.ResponseError(errorMessage, undefined, 400);
}

// ----------------------------------
//             queries
// ----------------------------------

/**
 * Retrieve all tags and the number of workflows each tag is related to.
 */
export async function getTagsWithCountDb(tablePrefix: string): Promise<ITagWithCountDb[]> {
	return getConnection()
		.createQueryBuilder()
		.select(`${tablePrefix}tag_entity.id`, 'id')
		.addSelect(`${tablePrefix}tag_entity.name`, 'name')
		.addSelect(`COUNT(${tablePrefix}workflows_tags.workflowId)`, 'usageCount')
		.from(`${tablePrefix}tag_entity`, 'tag_entity')
		.leftJoin(
			`${tablePrefix}workflows_tags`,
			'workflows_tags',
			`${tablePrefix}workflows_tags.tagId = tag_entity.id`,
		)
		.groupBy(`${tablePrefix}tag_entity.id`)
		.getRawMany()
		.then((tagsWithCount) => {
			tagsWithCount.forEach((tag) => {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
				tag.id = tag.id.toString();
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				tag.usageCount = Number(tag.usageCount);
			});
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return tagsWithCount;
		});
}

// ----------------------------------
//             mutations
// ----------------------------------

/**
 * Relate a workflow to one or more tags.
 */
export async function createRelations(workflowId: string, tagIds: string[], tablePrefix: string) {
	return getConnection()
		.createQueryBuilder()
		.insert()
		.into(`${tablePrefix}workflows_tags`)
		.values(tagIds.map((tagId) => ({ workflowId, tagId })))
		.execute();
}

/**
 * Remove all tags for a workflow during a tag update operation.
 */
export async function removeRelations(workflowId: string, tablePrefix: string) {
	return getConnection()
		.createQueryBuilder()
		.delete()
		.from(`${tablePrefix}workflows_tags`)
		.where('workflowId = :id', { id: workflowId })
		.execute();
}
