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
 * Map keys in sorted order at every level, so two equal maps hash the same. List order
 * stays. For a flat map of strings, the only shape the data migration writes, this is
 * the same as its top-level sort.
 */
function sortKeys(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(sortKeys);
	if (value === null || typeof value !== 'object') return value;
	return Object.fromEntries(
		Object.entries(value)
			.sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
			.map(([key, entry]) => [key, sortKeys(entry)]),
	);
}

/**
 * Identity of a version's content, name included. Save creates no version when the
 * draft has the hash of the latest version.
 *
 * The data migration `MigrateAgentSkillsToHub` computes the same value. Keep both in sync.
 */
export function skillContentHash(content: SkillContent): string {
	return createHash('sha256')
		.update(
			JSON.stringify({
				name: content.name,
				description: content.description,
				instructions: content.instructions,
				frontmatter: content.frontmatter ? sortKeys(content.frontmatter) : null,
				files: content.files
					.map((file) => [file.path, file.content])
					.sort(([left], [right]) => compareSkillFilePaths(left, right)),
			}),
		)
		.digest('hex');
}
