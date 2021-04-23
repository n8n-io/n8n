// import { omit } from 'lodash';
import { getConnection } from "typeorm";
import { validate } from 'class-validator';

import {
	ITagDb,
	ITagRes,
	ResponseHelper,
} from ".";

import {
	TagEntity,
} from "./databases/entities/TagEntity";

import {
	ITagWithCountDb,
	ITagWithCountRes,
	IWorkflowDb,
	IWorkflowResponse,
} from "./Interfaces";


// ----------------------------------
//              utils
// ----------------------------------

/**
 * Format `ITagDb[]` into `ITagRes[]`.
 */
export function toTagsRes(tags: ITagDb[]): ITagRes[] {
	return tags.map(({ id, name }) => ({ id: id.toString(), name }));
}

/**
 * Format `TagWithCountDb[]` into `ITagWithCountRes[]`.
 */
export function toTagsWithCount(tagsWithCount: ITagWithCountDb[]): ITagWithCountRes[] {
	return tagsWithCount.map(({ id, name, usageCount }) => ({ id: id.toString(), name, usageCount }));
}

/**
 * Create an cloned object without a property.
 */
const omit = (keyToOmit: string, { [keyToOmit]: _, ...omittedPropObj }) => omittedPropObj;

/**
 * Format `IWorkflowDb` into `IWorkflowResponse`.
 */
export function toWorkflowRes(workflowDb: IWorkflowDb) {
	const workflowRes = omit('tags', workflowDb) as IWorkflowResponse;
	workflowRes.id = workflowDb.id.toString();

	if (workflowDb.tags.length) {
		workflowRes.tags = toTagsRes(workflowDb.tags);
	}

	return workflowRes;
}

/**
 * Sort an `ITagDb[]` by the order of the tag IDs in the incoming request.
 */
export function sortByRequestOrder(tagsDb: ITagDb[], tagIds: string[]) {
	const tagMap = tagsDb.reduce((acc, tag) => {
		acc[tag.id.toString()] = tag;
		return acc;
	}, {} as { [key: string]: ITagDb });

	return tagIds.map(tagId => tagMap[tagId]);
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
		throw new ResponseHelper.ResponseError(JSON.stringify(errors), undefined, 400);
	}
}

// ----------------------------------
//             queries
// ----------------------------------

/**
 * Retrieve all tags and the number of workflows each tag is related to.
 */
export async function getTagsWithCountDb(tablePrefix: string): Promise<ITagWithCountDb[]> {
	return await getConnection()
	.createQueryBuilder()
	.select(`${tablePrefix}tag_entity.id`, 'id')
	.addSelect(`${tablePrefix}tag_entity.name`, 'name')
	.addSelect(`COUNT(${tablePrefix}workflows_tags.workflowId)`, 'usageCount')
	.from(`${tablePrefix}tag_entity`, 'tag_entity')
	.leftJoin(`${tablePrefix}workflows_tags`, 'workflows_tags', `${tablePrefix}workflows_tags.tagId = tag_entity.id`)
	.groupBy(`${tablePrefix}tag_entity.id`)
	.getRawMany();
}

// ----------------------------------
//             mutations
// ----------------------------------

/**
 * Relate a workflow to one or more tags.
 */
export async function createRelations(workflowId: string, tagIds: string[], tablePrefix: string) {
	await getConnection()
		.createQueryBuilder()
		.insert()
		.into(`${tablePrefix}workflows_tags`)
		.values(tagIds.map(tagId => ({ workflowId, tagId })))
		.execute();
}

/**
 * Remove all tags for a workflow during a tag update operation.
 */
export async function removeRelations(workflowId: string, tablePrefix: string) {
	await getConnection()
		.createQueryBuilder()
		.delete()
		.from(`${tablePrefix}workflows_tags`)
		.where('workflowId = :id', { id: workflowId })
		.execute();
}
