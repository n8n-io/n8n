/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable import/no-cycle */
import { EntityManager, getConnection } from 'typeorm';

import { TagEntity } from './databases/entities/TagEntity';

import { ITagToImport, ITagWithCountDb } from './Interfaces';

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
		acc[tag.id.toString()] = tag;
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

const findOrCreateTag = async (transactionManager: EntityManager, importTag: ITagToImport, tagsEntities: TagEntity[]): Promise<TagEntity> => {
	// Assume tag is identical if createdAt date is the same to preserve a changed tag name
	const identicalMatch = tagsEntities.find(
		(existingTag) =>
			existingTag.id.toString() === importTag.id.toString() &&
			existingTag.createdAt &&
			importTag.createdAt &&
			new Date(existingTag.createdAt) === new Date(importTag.createdAt),
	);
	if (identicalMatch) {
		return identicalMatch;
	}

	// Find tag with identical name
	const nameMatch = tagsEntities.find((existingTag) => existingTag.name === importTag.name);
	if (nameMatch) {
		return nameMatch;
	}

	// Create new Tag
	const createdTag = await createTag(transactionManager, importTag.name);
	return createdTag;
};

/**
 * Set tag ids to use existing tags, creates a new tag if no matching tag could be found
 *
 * @param transactionManager
 * @param workflow
 * @param tagsEntities
 * @returns
 */
export async function setTagsForImport(
	transactionManager: EntityManager,
	workflow: { tags: ITagToImport[] },
	tags: TagEntity[],
): Promise<void> {

	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
	const workflowTags = workflow.tags;
	if (!workflowTags || !Array.isArray(workflowTags) || workflowTags.length === 0) {
		return;
	}
	for (let i = 0; i < workflowTags.length; i++) {
		// eslint-disable-next-line no-await-in-loop
		if (workflowTags[i] && typeof workflowTags[i].name !== 'undefined' && typeof workflowTags[i].id !== 'undefined') {
			const tag = await findOrCreateTag(transactionManager, workflowTags[i], tags);
			workflowTags[i] = {
				id: tag.id,
				name: tag.name,
			};
		}
	}
}

