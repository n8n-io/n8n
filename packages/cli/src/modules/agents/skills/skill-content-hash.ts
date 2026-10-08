import { createHash } from 'node:crypto';

import type { SkillFrontmatter } from '../entities/skill-version.entity';

/** Everything one `skill_version` row holds, the name included. */
export type SkillContent = {
	name: string;
	description: string;
	instructions: string;
	frontmatter: SkillFrontmatter | null;
	files: Array<{ path: string; content: string }>;
};

/** Plain code-unit order, the same order every reader of `skill_file` uses. */
export function compareSkillFilePaths(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * Identity of a version's content, name included. Save creates no version when the
 * draft has the hash of the latest version.
 *
 * The data migration `MigrateAgentSkillsToHub` computes the same value. Keep both in sync.
 */
export function skillContentHash(content: SkillContent): string {
	const { frontmatter } = content;
	return createHash('sha256')
		.update(
			JSON.stringify({
				name: content.name,
				description: content.description,
				instructions: content.instructions,
				frontmatter: frontmatter
					? Object.fromEntries(
							Object.keys(frontmatter)
								.sort()
								.map((key) => [key, frontmatter[key]]),
						)
					: null,
				files: content.files
					.map((file) => [file.path, file.content])
					.sort(([left], [right]) => compareSkillFilePaths(left, right)),
			}),
		)
		.digest('hex');
}
