import { isRecord } from '@n8n/utils/is-record';
import type { JsonObject } from 'swagger-ui-express';

// GitBook extension reference - https://gitbook.com/docs/create-content/openapi/extensions-reference
export const GITBOOK_DISPLAY_NAME_FIELD = 'x-displayName';
export const GITBOOK_PARENT_TAG_FIELD = 'x-parent';

/**
 * Strip GitBook specific nesting tags from the OpenAPI spec.
 * Swagger UI would render these as empty tags otherwise.
 */
export function stripGitBookParentTags(spec: JsonObject): JsonObject {
	const tags = Array.isArray(spec.tags) ? spec.tags : [];

	// Valid tags must be objects
	const validTags = tags.filter(isRecord);

	const parentTagNames = validTags
		.map((tag) => tag[GITBOOK_PARENT_TAG_FIELD])
		.filter((name): name is string => typeof name === 'string');
	const uniqueParentTagNames = new Set(parentTagNames);

	const swaggerTags = validTags.flatMap((tag) => {
		if (uniqueParentTagNames.has(String(tag.name))) {
			return [];
		}

		const child = { ...tag };

		delete child[GITBOOK_PARENT_TAG_FIELD];

		return [child];
	});

	return { ...spec, tags: swaggerTags };
}
