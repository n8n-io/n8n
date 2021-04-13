import {
	FindManyOptions,
	FindOneOptions,
	getConnection,
	In,
} from "typeorm";

import {
	Db,
	ResponseHelper,
} from ".";

/**
 * Validate whether a tag name exists so that it cannot be used for a tag create or tag update operation.
 */
export async function validateName(name: string): Promise<void> | never {
	const findQuery = { where: { name } } as FindOneOptions;
	const tag = await Db.collections.Tag!.findOne(findQuery);

	if (tag) {
		throw new ResponseHelper.ResponseError('Tag name already exists.', undefined, 400);
	}
}

/**
 * Validate whether a tag ID exists so that it can be used for a workflow create or tag update operation.
 */
export async function validateId(id: number): Promise<void> | never {
	const findQuery = { where: { id } } as FindOneOptions;
	const tag = await Db.collections.Tag!.findOne(findQuery);

	if (!tag) {
		throw new ResponseHelper.ResponseError(`Tag with ID ${id} does not exist.`, undefined, 400);
	}
}

/**
 * Validate whether a tag name has 1 to 24 characters.
 */
export function validateLength(name: string): void | never {
	if (name.length < 0 || name.length > 24) {
		throw new ResponseHelper.ResponseError('Tag name must be 1 to 24 characters long.', undefined, 400);
	}
}

/**
 * Validate whether the request body for a create/update operation has a `name` property.
 */
export function validateRequestBody({ name }: { name: string }): void | never {
	if (!name) {
		throw new ResponseHelper.ResponseError(`Property 'name' missing from request body.`, undefined, 400);
	}
}

/**
 * Validate that a tag and a workflow are not related so that a link can be created.
 */
export async function validateNoRelation(workflowId: number, tagId: number): Promise<void> | never {
	const result = await findRelation(workflowId, tagId);

	if (result.length) {
		throw new ResponseHelper.ResponseError(`Workflow ID ${workflowId} and tag ID ${tagId} are already related.`, undefined, 400);
	}
}

/**
 * Validate that a tag and a workflow are related so that their link can be deleted.
 */
export async function validateRelation(workflowId: number, tagId: number): Promise<void> | never {
	const result = await findRelation(workflowId, tagId);

	if (!result.length) {
		throw new ResponseHelper.ResponseError(`Workflow ID ${workflowId} and tag ID ${tagId} are not related.`, undefined, 400);
	}
}

/**
 * Find a relation between a workflow and a tag, if any.
 */
async function findRelation(workflowId: number, tagId: number): Promise<Array<{ workflowId: number, tagId: number }>> {
	return await getConnection().createQueryBuilder()
		.select()
		.from('workflows_tags', 'workflows_tags')
		.where('workflowId = :workflowId AND tagId = :tagId', { workflowId, tagId })
		.execute();
}

/**
 * Remove all tags for a workflow during a tag update operation.
 */
export async function deleteAllTagsForWorkflow(workflowId: string) {
	await getConnection().createQueryBuilder()
		.delete()
		.from('workflows_tags')
		.where('workflowId = :id', { id: workflowId })
		.execute();
}

/**
 * Associate a workflow with one or many tags.
 */
export async function createTagWorkflowRelations(workflowId: string, tagIds: number[]) {
	await getConnection().createQueryBuilder()
		.insert()
		.into('workflows_tags')
		.values(tagIds.map(tagId => ({ workflowId, tagId })))
		.execute();
}

/**
 * Return tag IDs and names, only for use in a response.
 */
export async function getTagsForResponseData(tagIds: number[]) {
	return await Db.collections.Tag!.find({
		select: ['id', 'name'],
		where: { id: In(tagIds) },
	});
}
