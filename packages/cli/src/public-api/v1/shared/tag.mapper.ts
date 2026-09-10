import type { TagPublicDto } from '@n8n/api-types';
import type { TagEntity } from '@n8n/db';

export function toPublicTag(tag: TagEntity): TagPublicDto {
	return {
		id: tag.id,
		name: tag.name,
		createdAt: tag.createdAt.toISOString(),
		updatedAt: tag.updatedAt.toISOString(),
	};
}
