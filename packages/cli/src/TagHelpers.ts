import {
	getConnection,
} from "typeorm";

import {
	Db,
	ITagDb,
	ResponseHelper,
} from ".";

const TAG_NAME_LENGTH_LIMIT = 24;

// ----------------------------------
//              utils
// ----------------------------------

/**
 * Type guard for string array.
 */
function isStringArray(tags: unknown[]): tags is string[] {
	return Array.isArray(tags) && tags.every((value) => typeof value === 'string');
}

/**
 * Stringify the ID in every `ITagDb` in an array.
 * Side effect: Remove `createdAt` and `updatedAt` for a slimmer response.
 */
export function getTagsResponse(tags: ITagDb[]) {
	return tags.map(({ id, name }) => ({ id: id.toString(), name }));
}

/**
 * Check if a workflow and a tag are related.
 */
async function checkRelated(workflowId: string, tagId: string): Promise<boolean> {
	const result = await getConnection().createQueryBuilder()
		.select()
		.from('workflows_tags', 'workflows_tags')
		.where('workflowId = :workflowId AND tagId = :tagId', { workflowId, tagId })
		.execute();

	return result.length > 0;
}

/**
 * Check whether a tag ID exists in the `tag_entity` table.
 *
 * Used for creating a workflow or updating a tag.
 */
export async function exists(id: string): Promise<void> | never {
	const tag = await Db.collections.Tag!.findOne({ where: { id }});

	if (!tag) {
		throw new ResponseHelper.ResponseError(`Tag with ID ${id} does not exist.`, undefined, 400);
	}
}

// ----------------------------------
//           validators
// ----------------------------------

/**
 * Validate whether every tag ID is a string array and exists in the `tag_entity` table.
 *
 * Used for creating a workflow or updating a tag.
 */
export async function validateTags(tags: unknown[]): Promise<void> | never {
	if (!isStringArray(tags)) {
		throw new ResponseHelper.ResponseError(`The tags property is not an array of strings.`, undefined, 400);
	}

	for (const tagId of tags) {
		await exists(tagId);
	}
}

/**
 * Validate whether a tag name
 * - is present in the request body,
 * - is a string,
 * - is 1 to 24 characters long, and
 * - does not exist already.
 *
 * Used for creating or updating a tag.
 */
export async function validateName(name: unknown): Promise<void> | never {
	if (name === undefined) {
		throw new ResponseHelper.ResponseError(`Property 'name' missing from request body.`, undefined, 400);
	}

	if (typeof name !== 'string') {
		throw new ResponseHelper.ResponseError(`Property 'name' must be a string.`, undefined, 400);
	}

	if (name.length <= 0 || name.length > TAG_NAME_LENGTH_LIMIT) {
		throw new ResponseHelper.ResponseError('Tag name must be 1 to 24 characters long.', undefined, 400);
	}

	const tag = await Db.collections.Tag!.findOne({ where: { name } });

	if (tag) {
		throw new ResponseHelper.ResponseError('Tag name already exists.', undefined, 400);
	}
}

/**
 * Validate that the provided tags are related to a workflow.
 *
 * Used for relating the tags and the workflow.
 */
export async function validateNotRelated(workflowId: string, tags: string[]): Promise<void> | never {
	tags.forEach(async tagId => {
		const areRelated = await checkRelated(workflowId, tagId);

		if (areRelated) {
			throw new ResponseHelper.ResponseError(`Workflow ID ${workflowId} and tag ID ${tagId} are already related.`, undefined, 400);
		}
	});
}

// ----------------------------------
//             queries
// ----------------------------------

/**
 * Retrieve all existing tags, whether related to a workflow or not,
 * including how many workflows each tag is related to.
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
export async function removeRelations(workflowId: string) {
	await getConnection().createQueryBuilder()
		.delete()
		.from('workflows_tags')
		.where('workflowId = :id', { id: workflowId })
		.execute();
}
