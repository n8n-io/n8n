import { Service } from '@n8n/di';
import type { TagEntity } from '@n8n/db';

import type { Serializer } from '../serializer';
import type { SerializedTag } from '../../spec/serialized/tag.serialized';

@Service()
export class TagSerializer implements Serializer<TagEntity, SerializedTag> {
	serialize(tag: TagEntity): SerializedTag {
		return {
			id: tag.id,
			name: tag.name,
		};
	}
}
