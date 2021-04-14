import {
	FindOneOptions,
	getConnection,
	In,
} from "typeorm";

import {
	Db,
	ITagDb,
	IWorkflowDb,
	ResponseHelper,
} from ".";


// ----------------------------------
//           validators
// ----------------------------------

/**
 * Validate whether a tag ID exists so that it can be used for a workflow create or tag update operation.
 */
export async function validateId(id: string): Promise<void> | never {
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
	if (name.length <= 0 || name.length > 24) {
		throw new ResponseHelper.ResponseError('Tag name must be 1 to 24 characters long.', undefined, 400);
	}
}

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
 * Validate that a tag and a workflow are not related so that a link can be created.
 */
export async function validateNoRelation(workflowId: number, tagId: number): Promise<void> | never {
	const areRelated = await checkRelated(workflowId, tagId);

	if (areRelated) {
		throw new ResponseHelper.ResponseError(`Workflow ID ${workflowId} and tag ID ${tagId} are already related.`, undefined, 400);
	}
}

/**
 * Validate that a tag and a workflow are related so that their link can be deleted.
 */
export async function validateRelation(workflowId: number, tagId: number): Promise<void> | never {
	const areRelated = await checkRelated(workflowId, tagId);

	if (!areRelated) {
		throw new ResponseHelper.ResponseError(`Workflow ID ${workflowId} and tag ID ${tagId} are not related.`, undefined, 400);
	}
}

/**
 * Validate whether the request body for a create/update operation has a `name` property.
 */
export function validateRequestBody({ name }: { name: string | undefined }): void | never {
	if (!name) {
		throw new ResponseHelper.ResponseError(`Property 'name' missing from request body.`, undefined, 400);
	}
}


// ----------------------------------
//             queries
// ----------------------------------

/**
 * Check if a workflow and a tag are related. Used only in validators.
 */
async function checkRelated(
	workflowId: number,
	tagId: number
): Promise<boolean> {
	const result = await getConnection().createQueryBuilder()
		.select()
		.from('workflows_tags', 'workflows_tags')
		.where('workflowId = :workflowId AND tagId = :tagId', { workflowId, tagId })
		.execute();

	return result.length > 0;
}

/**
 * Retrieve all existing tags, whether linked to a workflow or not,
 * including how many workflows each tag is linked to.
 */
export async function getAllTagsWithUsageCount(): Promise<Array<{
	id: number;
	name: string;
	usageCount: number
}>> {
	return await getConnection().createQueryBuilder()
		.select('tag_entity.id', 'id')
		.addSelect('tag_entity.name', 'name')
		.addSelect('COUNT(workflow_entity.id)', 'usageCount')
		.from('tag_entity', 'tag_entity')
		.leftJoin('workflows_tags', 'workflows_tags', 'workflows_tags.tagId = tag_entity.id')
		.leftJoin('workflow_entity', 'workflow_entity', 'workflows_tags.workflowId = workflow_entity.id')
		.groupBy('tag_entity.id')
		.getRawMany();
}

/**
 * Retrieve the tags related to a single workflow.
 */
export async function getWorkflowTags(
	workflowId: string
): Promise<Array<{ id: string; name: string }>> {
	return await getConnection()
		.createQueryBuilder()
		.select('tag_entity.id', 'id')
		.addSelect('tag_entity.name', 'name')
		.from('tag_entity', 'tag_entity')
		.leftJoin('workflows_tags', 'workflows_tags', 'workflows_tags.tagId = tag_entity.id')
		.where('workflowId = :workflowId', { workflowId })
		.getRawMany();
}


// ----------------------------------
//             mutations
// ----------------------------------

/**
 * Relate a workflow to one or more tags.
 */
export async function createRelations(workflowId: string, tagIds: string[]) {
	await getConnection().createQueryBuilder()
		.insert()
		.into('workflows_tags')
		.values(tagIds.map(tagId => ({ workflowId, tagId })))
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
