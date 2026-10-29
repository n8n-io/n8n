// Which folders of a repository are skills. Pure functions over the file paths, so a table
// test covers the rules without an archive.
import { SKILL_SOURCE_MAX_SKILLS } from '@n8n/api-types';

/** A skill is a folder with this file. */
export const SKILL_FILE = 'SKILL.md';

/** Folders that never hold skills: dependencies, git data and vendored code. */
const SKIPPED_FOLDERS = new Set(['node_modules', '.git', 'vendor', 'third_party']);

export type SkillDiscoveryLimits = {
	/** The most skills that one source lists. */
	maxSkills: number;
	/** The deepest skill folder below the root of the source, in folders. */
	maxDepth: number;
};

export const DEFAULT_SKILL_DISCOVERY_LIMITS: SkillDiscoveryLimits = {
	maxSkills: SKILL_SOURCE_MAX_SKILLS,
	maxDepth: 8,
};

/**
 * The skill folders under `root`, in path order: every folder with a SKILL.md at any depth up
 * to `maxDepth`. A skill folder inside another skill folder belongs to the outer skill, so it
 * is not a skill of its own. `truncated` is true when more than `maxSkills` folders matched.
 * `tooDeep` counts the skill folders below `maxDepth` that were left out.
 */
export function findSkillFolders(
	paths: Iterable<string>,
	root: string,
	limits: SkillDiscoveryLimits = DEFAULT_SKILL_DISCOVERY_LIMITS,
): { folders: string[]; truncated: boolean; tooDeep: number } {
	const candidates: string[] = [];
	const deep: string[] = [];
	for (const path of paths) {
		const segments = path.split('/');
		if (segments.at(-1) !== SKILL_FILE) continue;
		const folder = segments.slice(0, -1).join('/');
		if (!isInside(folder, root)) continue;
		if (segments.slice(0, -1).some((segment) => SKIPPED_FOLDERS.has(segment))) continue;
		if (relativeSegments(folder, root).length > limits.maxDepth) deep.push(folder);
		else candidates.push(folder);
	}
	candidates.sort(comparePaths);
	const folders: string[] = [];
	const accepted = new Set<string>();
	for (const folder of candidates) {
		// Sorted, so an outer skill comes before the skills inside it.
		if (ancestorsOf(folder).some((outer) => accepted.has(outer))) continue;
		accepted.add(folder);
		folders.push(folder);
	}
	// A deep folder inside a skill, or inside a deeper skill, is not a skill of its own.
	const holders = new Set([...accepted, ...deep]);
	return {
		folders: folders.slice(0, limits.maxSkills),
		truncated: folders.length > limits.maxSkills,
		tooDeep: deep.filter((folder) => !ancestorsOf(folder).some((outer) => holders.has(outer)))
			.length,
	};
}

/**
 * The files of one skill folder, with paths relative to the folder. Files in skipped
 * folders and in skill folders nested inside it are not part of the skill.
 */
export function filesOfSkill(paths: Iterable<string>, folder: string): string[] {
	const inside = [...paths].filter((path) => folder === '' || path.startsWith(`${folder}/`));
	const nested = new Set(
		inside
			.filter((path) => path.endsWith(`/${SKILL_FILE}`))
			.map((path) => path.slice(0, -(SKILL_FILE.length + 1)))
			.filter((dir) => dir !== folder),
	);
	return inside
		.filter((path) => {
			const below = relativeSegments(path.split('/').slice(0, -1).join('/'), folder);
			if (below.some((segment) => SKIPPED_FOLDERS.has(segment))) return false;
			// One set lookup for each folder above the file, so a large repository stays linear.
			let dir = folder;
			for (const segment of below) {
				dir = dir ? `${dir}/${segment}` : segment;
				if (nested.has(dir)) return false;
			}
			return true;
		})
		.map((path) => (folder === '' ? path : path.slice(folder.length + 1)));
}

/** Whether `path` is `folder` or below it. The empty folder is the root. */
export function isInside(path: string, folder: string): boolean {
	return folder === '' || path === folder || path.startsWith(`${folder}/`);
}

/** Every folder above `folder`, the root (empty) first. */
function ancestorsOf(folder: string): string[] {
	if (folder === '') return [];
	const segments = folder.split('/');
	return segments.map((_, index) => segments.slice(0, index).join('/'));
}

function relativeSegments(path: string, root: string): string[] {
	const rest = root === '' ? path : path.slice(root.length + 1);
	return rest === '' ? [] : rest.split('/');
}

function comparePaths(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}
