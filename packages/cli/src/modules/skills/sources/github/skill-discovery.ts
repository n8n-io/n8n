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
 * The files of one skill folder, with paths relative to the folder. Discovery chooses
 * the skill root. Nested directories are part of that skill.
 */
export function filesOfSkill(paths: Iterable<string>, folder: string): string[] {
	return [...paths].flatMap((path) =>
		folder === '' ? [path] : path.startsWith(`${folder}/`) ? [path.slice(folder.length + 1)] : [],
	);
}

/** The skill folder that holds a file, at any depth. Undefined for a file outside the skills. */
function skillFolderOf(path: string, folders: ReadonlySet<string>): string | undefined {
	for (let slash = path.lastIndexOf('/'); slash > 0; slash = path.lastIndexOf('/', slash - 1)) {
		const folder = path.slice(0, slash);
		if (folders.has(folder)) return folder;
	}
	return folders.has('') ? '' : undefined;
}

const MARKDOWN_FILE = /\.(?:md|markdown)$/i;

/**
 * The rank of a file when a skill holds more than n8n keeps. A lower rank stays first:
 * `references/`, then `scripts/` and `assets/`, then other files, then dependency folders.
 * The path is relative to the skill folder. No file is excluded, so a link in SKILL.md to any
 * of them works when the skill is within the limits.
 */
function skillFileRank(path: string): number {
	const folders = path.split('/').slice(0, -1);
	if (folders.some((folder) => SKIPPED_FOLDERS.has(folder))) return 3;
	if (folders[0] === 'references') return 0;
	if (folders[0] === 'scripts' || folders[0] === 'assets') return 1;
	return 2;
}

/** Sorts the files of one skill by rank, then by path. */
export function compareSkillFilePriority(left: string, right: string): number {
	return skillFileRank(left) - skillFileRank(right) || comparePaths(left, right);
}

export type SkillFileSelectionLimits = {
	/** The most files of one skill, without SKILL.md. */
	maxFiles: number;
	/** The most bytes of one skill. */
	maxSkillBytes: number;
	/** The most bytes of all skills together. */
	maxTotalBytes: number;
	/** A larger file keeps no bytes, so it does not count. */
	maxFileBytes: number;
};

/**
 * The files whose bytes a reader keeps, from the size of every file. A skill keeps at most
 * `maxFiles` files and `maxSkillBytes` bytes, so a reader downloads no file that the skill
 * cannot store. SKILL.md and the Markdown files in `references/` come first for every skill,
 * because they are what n8n kept before it kept other files. The other files follow in
 * priority order while the bytes of all skills fit `maxTotalBytes`. A file over
 * `maxFileBytes` is in the result, so the reader lists it as too large.
 * When `starvedFolders` is provided, records each skill folder that had at least one file
 * skipped only because the shared `maxTotalBytes` budget was exhausted.
 */
export function selectSkillFiles(
	sizes: ReadonlyMap<string, number>,
	folders: ReadonlySet<string>,
	limits: SkillFileSelectionLimits,
	starvedFolders?: Set<string>,
): Set<string> {
	const keep = new Set<string>();
	const skills = new Map<
		string,
		{ references: string[]; files: string[]; count: number; bytes: number }
	>();
	const relative = (path: string, folder: string) =>
		folder === '' ? path : path.slice(folder.length + 1);
	let total = 0;
	for (const [path, size] of sizes) {
		const folder = skillFolderOf(path, folders);
		if (folder === undefined) continue;
		if (size > limits.maxFileBytes) {
			keep.add(path);
			continue;
		}
		const skill = skills.get(folder) ?? { references: [], files: [], count: 0, bytes: 0 };
		skills.set(folder, skill);
		const file = relative(path, folder);
		if (file === SKILL_FILE) {
			keep.add(path);
			total += size;
		} else if (skillFileRank(file) === 0 && MARKDOWN_FILE.test(file)) {
			skill.references.push(path);
		} else {
			skill.files.push(path);
		}
	}
	// Apply per-skill limits to Markdown references first, in path order, before other files.
	for (const [folder, skill] of skills) {
		skill.references.sort((left, right) =>
			comparePaths(relative(left, folder), relative(right, folder)),
		);
		for (const path of skill.references) {
			const size = sizes.get(path) ?? 0;
			if (skill.count >= limits.maxFiles || skill.bytes + size > limits.maxSkillBytes) {
				continue;
			}
			keep.add(path);
			total += size;
			skill.count += 1;
			skill.bytes += size;
		}
	}
	for (const [folder, skill] of skills) {
		skill.files.sort((left, right) =>
			compareSkillFilePriority(relative(left, folder), relative(right, folder)),
		);
		for (const path of skill.files) {
			const size = sizes.get(path) ?? 0;
			if (skill.count >= limits.maxFiles || skill.bytes + size > limits.maxSkillBytes) {
				continue;
			}
			if (total + size > limits.maxTotalBytes) {
				starvedFolders?.add(folder);
				continue;
			}
			keep.add(path);
			total += size;
			skill.count += 1;
			skill.bytes += size;
		}
	}
	return keep;
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
