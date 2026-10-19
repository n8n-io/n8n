export function toPublicTag(tag: { id: string; name: string; createdAt: Date; updatedAt: Date }) {
	return {
		id: tag.id,
		name: tag.name,
		createdAt: tag.createdAt.toISOString(),
		updatedAt: tag.updatedAt.toISOString(),
	};
}
