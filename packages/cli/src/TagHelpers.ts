/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import type { EntityManager } from 'typeorm';

import { getConnection } from '@/Db';
import { TagEntity } from '@db/entities/TagEntity';
import type { ITagToImport, ITagWithCountDb, IWorkflowToImport } from '@/Interfaces';

// ----------------------------------
//              utils
// ----------------------------------

/**
 * Sort tags based on the order of the tag IDs in the request.
 */
export function sortByRequestOrder(
	tags: TagEntity[],
	{ requestOrder }: { requestOrder: string[] },
) {
	const tagMap = tags.reduce<Record<string, TagEntity>>((acc, tag) => {
		acc[tag.id] = tag;
		return acc;
	}, {});

	return requestOrder.map((tagId) => tagMap[tagId]);
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
		.addSelect(`${tablePrefix}tag_entity.createdAt`, 'createdAt')
		.addSelect(`${tablePrefix}tag_entity.updatedAt`, 'updatedAt')
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
				// NOTE: since this code doesn't use the DB entities, we need to stringify the IDs manually
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

const createTag = async (transactionManager: EntityManager, name: string): Promise<TagEntity> => {
	const tag = new TagEntity();
	tag.name = name;
	return transactionManager.save<TagEntity>(tag);
};

const findOrCreateTag = async (
	transactionManager: EntityManager,
	importTag: ITagToImport,
	tagsEntities: TagEntity[],
): Promise<TagEntity> => {
	// Assume tag is identical if createdAt date is the same to preserve a changed tag name
	const identicalMatch = tagsEntities.find(
		(existingTag) =>
			existingTag.id === importTag.id &&
			existingTag.createdAt &&
			importTag.createdAt &&
			existingTag.createdAt.getTime() === new Date(importTag.createdAt).getTime(),
	);
	if (identicalMatch) {
		return identicalMatch;
	}

	const nameMatch = tagsEntities.find((existingTag) => existingTag.name === importTag.name);
	if (nameMatch) {
		return nameMatch;
	}

	const created = await createTag(transactionManager, importTag.name);
	tagsEntities.push(created);
	return created;
};

const hasTags = (workflow: IWorkflowToImport) =>
	'tags' in workflow && Array.isArray(workflow.tags) && workflow.tags.length > 0;

/**
 * Set tag IDs to use existing tags, creates a new tag if no matching tag could be found
 */
export async function setTagsForImport(
	transactionManager: EntityManager,
	workflow: IWorkflowToImport,
	tags: TagEntity[],
): Promise<void> {
	if (!hasTags(workflow)) {
		return;
	}

	const workflowTags = workflow.tags;
	const tagLookupPromises = [];
	for (let i = 0; i < workflowTags.length; i++) {
		if (workflowTags[i]?.name) {
			const lookupPromise = findOrCreateTag(transactionManager, workflowTags[i], tags).then(
				(tag) => {
					workflowTags[i] = {
						id: tag.id,
						name: tag.name,
					};
				},
			);
			tagLookupPromises.push(lookupPromise);
		}
	}

	await Promise.all(tagLookupPromises);
}
