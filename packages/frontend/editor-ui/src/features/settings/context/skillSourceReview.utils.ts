import type { DiscoveredSkill, SkillSourceSummary } from '@n8n/api-types';

/** The folder that holds the skill folders of one group, such as `skills`. `/` is the root. */
export type SkillFolderGroup<T> = { folder: string; skills: T[] };

/** The parent of a skill folder. A skill at the root, or in a top-level folder, is under `/`. */
function parentOf(location: string): string {
	const segments = location.split('/').filter(Boolean);
	return segments.length > 1 ? segments.slice(0, -1).join('/') : '/';
}

/**
 * The skills of a source by the folder that holds their skill folders, in the order of the
 * source. The review shows one group for each folder, with a checkbox for the group.
 */
export function groupByFolder<T extends { location: string }>(
	skills: T[],
): Array<SkillFolderGroup<T>> {
	const groups = new Map<string, SkillFolderGroup<T>>();
	for (const skill of skills) {
		const folder = parentOf(skill.location);
		const group = groups.get(folder) ?? { folder, skills: [] };
		group.skills.push(skill);
		groups.set(folder, group);
	}
	return [...groups.values()];
}

/** A skill that the user can tick: n8n can read it, its name is free, and the check did not block it. */
export function isSelectableSkill(skill: DiscoveredSkill): boolean {
	return !skill.nameTaken && !skill.error && skill.check?.verdict !== 'blocked';
}

/** The repository and branch of a source, such as `acme/skills · main`. */
export function sourceLineOf(source: Pick<SkillSourceSummary, 'label' | 'ref'>): string {
	return [source.label, source.ref].filter(Boolean).join(' · ');
}
