import type { EntityManager } from 'typeorm';
import { TagEntity } from '@db/entities/TagEntity';
import type { ITagToImport, IWorkflowToImport } from '@/Interfaces';

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
//             mutations
// ----------------------------------

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
