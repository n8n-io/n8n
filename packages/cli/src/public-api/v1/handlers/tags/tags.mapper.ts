type Tag = { id: string; name: string; createdAt: Date; updatedAt: Date };

export function toPublicTag(tag: Tag) {
	return {
		id: tag.id,
		name: tag.name,
		createdAt: tag.createdAt.toISOString(),
		updatedAt: tag.updatedAt.toISOString(),
	};
}
