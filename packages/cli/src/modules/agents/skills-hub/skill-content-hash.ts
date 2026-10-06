import { createHash } from 'node:crypto';

import type { SkillContent } from '../repositories/skill-hub.repository';

/**
 * Identity of a skill version's content, name included. File order is part of the
 * content. Stored on every `skill_version` row so publish can find a saved version
 * with the same content in one indexed query instead of loading them all.
 *
 * The data migration computes the same value for migrated rows; keep both in sync.
 */
export function skillContentHash(content: SkillContent): string {
	const frontmatter = content.frontmatter
		? Object.fromEntries(
				Object.keys(content.frontmatter)
					.sort()
					.map((key) => [key, content.frontmatter?.[key]]),
			)
		: null;
	return createHash('sha256')
		.update(
			JSON.stringify({
				name: content.name,
				description: content.description,
				instructions: content.instructions,
				frontmatter,
				files: content.files.map((file) => [file.path, file.content]),
			}),
		)
		.digest('hex');
}
