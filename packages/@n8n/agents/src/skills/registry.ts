import { isRecord } from '@n8n/utils/is-record';
import { createHash } from 'crypto';
import { existsSync, lstatSync, readdirSync, readFileSync, statSync } from 'fs';
import { basename, dirname, join, posix, relative } from 'path';

import {
	RUNTIME_SKILL_FILE_NAME,
	RUNTIME_SKILL_LINKED_FILE_GROUPS,
	RUNTIME_SKILL_REGISTRY_SCHEMA_VERSION,
	type RuntimeSkill,
	type RuntimeSkillLinkedFile,
	type RuntimeSkillLinkedFileGroup,
	type RuntimeSkillLinkedFiles,
	type RuntimeSkillRegistry,
	type RuntimeSkillRegistryEntry,
	type RuntimeSkillSource,
} from './types';
import { parseRuntimeSkillMarkdown, validateRuntimeSkill } from './validator';

const HASH_LENGTH = 12;
const IGNORED_DIRECTORIES = new Set(['.archive', '.git', '.github', '.hub', 'node_modules']);

export class InvalidRuntimeSkillError extends Error {
	constructor(reason: string) {
		super(reason);
		this.name = 'InvalidRuntimeSkillError';
	}
}

export interface LoadRuntimeSkillSourceFromDirectoryOptions {
	exclude?: string[];
	/**
	 * Transforms the received instructions, for example replacing placeholders, before
	 * the skill is registered and served through `load_skill`.
	 */
	transformInstructions?: (instructions: string) => string;
}

export function createRuntimeSkillSource(skills: RuntimeSkill[]): RuntimeSkillSource {
	const normalizedSkills = normalizeRuntimeSkills(skills);
	const skillsById = new Map(normalizedSkills.map((skill) => [skill.id, skill]));

	return {
		registry: createRuntimeSkillRegistry(normalizedSkills),
		loadSkill: async (skillId) => {
			const skill = skillsById.get(skillId);
			return await Promise.resolve(skill ?? null);
		},
	};
}

export function createRuntimeSkillRegistry(skills: RuntimeSkill[]): RuntimeSkillRegistry {
	const normalizedSkills = normalizeRuntimeSkills(skills);
	const entries = normalizedSkills.map(toRegistryEntry).sort(compareRegistryEntries);

	return {
		schemaVersion: RUNTIME_SKILL_REGISTRY_SCHEMA_VERSION,
		skillsHash: hashRegistry(entries),
		skills: entries,
	};
}

/**
 * Hide skills from an already-loaded source. Recomputes `skillsHash` so
 * manifests/prebaked bundles keyed on it can't match a differently-filtered
 * catalog, and wraps the loaders so hidden skills are unavailable rather than
 * just absent from the registry.
 */
export function filterRuntimeSkillSource(
	source: RuntimeSkillSource,
	excludeSkillIds: string[],
): RuntimeSkillSource {
	const excluded = new Set(excludeSkillIds);
	const remaining = new Set(
		source.registry.skills.filter((skill) => !excluded.has(skill.id)).map((skill) => skill.id),
	);
	const skills = source.registry.skills.flatMap((skill) => {
		if (excluded.has(skill.id)) return [];
		if (!skill.parents) return [skill];
		const parents = skill.parents.filter((id) => remaining.has(id));
		// A reference with no remaining parent cannot be discovered, so it is hidden too.
		if (parents.length === 0) {
			excluded.add(skill.id);
			return [];
		}
		return [parents.length === skill.parents.length ? skill : { ...skill, parents }];
	});
	// A hidden reference's file must not stay reachable as its owner's linked file.
	const hiddenFiles = new Set(
		source.registry.skills.flatMap((skill) =>
			skill.reference && excluded.has(skill.id)
				? [linkedFileKey(skill.reference.owner, skill.reference.path)]
				: [],
		),
	);
	const visibleSkills =
		hiddenFiles.size === 0
			? skills
			: skills.map((skill) => ({
					...skill,
					linkedFiles: {
						...skill.linkedFiles,
						references: skill.linkedFiles.references.filter(
							(file) => !hiddenFiles.has(linkedFileKey(skill.id, file.path)),
						),
					},
				}));
	const { loadFile } = source;

	return {
		...source,
		registry: {
			...source.registry,
			skillsHash: hashRegistry(visibleSkills),
			skills: visibleSkills,
		},
		loadSkill: async (skillId) => (excluded.has(skillId) ? null : await source.loadSkill(skillId)),
		...(loadFile
			? {
					loadFile: async (skillId: string, filePath: string) =>
						excluded.has(skillId) ||
						hiddenFiles.has(linkedFileKey(skillId, posix.normalize(filePath)))
							? null
							: await loadFile(skillId, filePath),
				}
			: {}),
	};
}

export function loadRuntimeSkillSourceFromDirectory(
	rootDir: string,
	options: LoadRuntimeSkillSourceFromDirectoryOptions = {},
): RuntimeSkillSource {
	const excludedSkillIds = new Set(options.exclude ?? []);
	const { transformInstructions = (instructions) => instructions } = options;

	const skills = loadRuntimeSkillsFromDirectory(rootDir)
		.filter((skill) => !excludedSkillIds.has(skill.id))
		.map((skill) => {
			return {
				...skill,
				instructions: transformInstructions(skill.instructions),
			};
		});

	const source = createRuntimeSkillSource(skills);
	const skillsById = new Map(skills.map((skill) => [skill.id, skill]));

	return {
		...source,
		loadFile: async (skillId, filePath) => {
			const skill = skillsById.get(skillId);
			if (!skill?.directory) return await Promise.resolve(null);

			const normalizedPath = normalizeLinkedFilePath(filePath);
			if (!normalizedPath) return await Promise.resolve(null);

			const linkedFile = findLinkedFile(skill.linkedFiles, normalizedPath);
			if (!linkedFile) return await Promise.resolve(null);

			return await Promise.resolve({
				skillId,
				filePath: normalizedPath,
				content: readFileSync(join(skill.directory, normalizedPath), 'utf-8'),
				bytes: linkedFile.bytes,
				sha256: linkedFile.sha256,
			});
		},
	};
}

export function loadRuntimeSkillsFromDirectory(rootDir: string): RuntimeSkill[] {
	if (!existsSync(rootDir) || !statSync(rootDir).isDirectory()) return [];

	const skills = collectSkillFiles(rootDir).flatMap((skillPath) => {
		const skillDir = dirname(skillPath);
		const sourceDirectory = toPosixPath(relative(rootDir, skillDir));
		validateRuntimeSkillFolder(skillDir, skillPath, sourceDirectory);

		const content = readFileSync(skillPath, 'utf-8');
		const parsed = parseRuntimeSkillMarkdown(content, {
			sourceName: basename(skillDir),
			path: toPosixPath(skillPath),
			sourcePath: toPosixPath(skillPath),
			directory: toPosixPath(skillDir),
			sourceDirectory,
			category: categoryFor(sourceDirectory),
		});

		if (!parsed.ok) {
			throw new InvalidRuntimeSkillError(
				`Invalid skill at ${sourceDirectory}: ${formatSkillValidationErrors(parsed.errors)}`,
			);
		}

		const skill: RuntimeSkill = { ...parsed.skill, linkedFiles: loadLinkedFiles(skillDir) };
		return [skill, ...loadReferenceSkills(skill, skillDir, sourceDirectory)];
	});
	assertSharedReferencesExist(skills);
	return skills;
}

const REFERENCE_SKILL_PATH = /^references\/[^/]+\.md$/;

function linkedFileKey(skillId: string, path: string): string {
	return `${skillId}\0${path}`;
}

/** `references/*.md` files that start with frontmatter become reference skills of their owner. */
function loadReferenceSkills(
	owner: RuntimeSkill,
	skillDir: string,
	sourceDirectory: string,
): RuntimeSkill[] {
	return (owner.linkedFiles?.references ?? []).flatMap((file) => {
		if (!REFERENCE_SKILL_PATH.test(file.path)) return [];
		const referencePath = join(skillDir, file.path);
		const content = readFileSync(referencePath, 'utf-8');
		if (content.split(/\r?\n/, 1)[0]?.trim() !== '---') return [];

		const location = `${sourceDirectory}/${file.path}`;
		const expectedName = posix.basename(file.path, '.md');
		const parsed = parseRuntimeSkillMarkdown(content, {
			sourceName: expectedName,
			path: toPosixPath(referencePath),
			sourcePath: toPosixPath(referencePath),
			directory: toPosixPath(skillDir),
			category: categoryFor(sourceDirectory),
		});
		if (!parsed.ok) {
			throw new InvalidRuntimeSkillError(
				`Invalid reference at ${location}: ${formatSkillValidationErrors(parsed.errors)}`,
			);
		}
		if (parsed.skill.name !== expectedName) {
			throw new InvalidRuntimeSkillError(
				`Reference at ${location} must be named "${expectedName}", got "${parsed.skill.name}"`,
			);
		}
		if (parsed.skill.sharedReferences) {
			throw new InvalidRuntimeSkillError(
				`Reference at ${location} cannot declare shared_references`,
			);
		}

		return [
			{
				...parsed.skill,
				parents: [owner.id],
				reference: { owner: owner.id, path: file.path },
			},
		];
	});
}

function assertSharedReferencesExist(skills: RuntimeSkill[]): void {
	const references = new Set(skills.filter((skill) => skill.reference).map((skill) => skill.id));
	for (const skill of skills) {
		for (const id of skill.sharedReferences ?? []) {
			if (!references.has(id)) {
				throw new InvalidRuntimeSkillError(`Skill "${skill.id}" shares unknown reference "${id}"`);
			}
		}
	}
}

/**
 * Adds skills that share a reference to its parents, drops parents that are
 * not in the set, and drops references left without a parent.
 */
function resolveReferenceParents(skills: RuntimeSkill[]): RuntimeSkill[] {
	const ids = new Set(skills.map((skill) => skill.id));
	const sharers = new Map<string, string[]>();
	for (const skill of skills) {
		if (skill.parents && skill.sharedReferences?.length) {
			throw new InvalidRuntimeSkillError(`Reference "${skill.id}" cannot share other references`);
		}
		for (const id of skill.sharedReferences ?? []) {
			sharers.set(id, [...(sharers.get(id) ?? []), skill.id]);
		}
	}

	return skills.flatMap((skill) => {
		const shared = sharers.get(skill.id);
		if (shared && !skill.parents) {
			throw new InvalidRuntimeSkillError(`Shared skill "${skill.id}" is not a reference`);
		}
		if (!skill.parents) return [skill];
		const parents = [...new Set([...skill.parents, ...(shared ?? [])])].filter((id) => ids.has(id));
		return parents.length > 0 ? [{ ...skill, parents }] : [];
	});
}

export function formatSkillValidationErrors(
	errors: Array<{ message: string; field?: string; path?: string; hint?: string }>,
): string {
	return errors
		.map((error) => {
			const field = error.field ? ` field "${error.field}"` : '';
			const path = error.path ? ` (${error.path})` : '';
			const hint = error.hint ? ` Hint: ${error.hint}` : '';
			return `${error.message}${field}${path}.${hint}`;
		})
		.join(' ');
}

function normalizeRuntimeSkills(skills: RuntimeSkill[]): RuntimeSkill[] {
	const sortedSkills = resolveReferenceParents(skills).sort(compareRuntimeSkills);
	const seenIds = new Set<string>();
	const seenNames = new Set<string>();
	const seenSourceDirectories = new Set<string>();

	return sortedSkills.map((skill) => {
		const normalizedSkill: RuntimeSkill = {
			...skill,
			linkedFiles: normalizeLinkedFiles(skill.linkedFiles),
		};
		const validation = validateRuntimeSkill(normalizedSkill);
		if (!validation.ok) {
			throw new InvalidRuntimeSkillError(formatSkillValidationErrors(validation.errors));
		}

		if (seenIds.has(normalizedSkill.id)) {
			throw new InvalidRuntimeSkillError(`Duplicate skill id "${normalizedSkill.id}"`);
		}
		seenIds.add(normalizedSkill.id);

		const normalizedName = normalizedSkill.name.toLowerCase();
		if (seenNames.has(normalizedName)) {
			throw new InvalidRuntimeSkillError(`Duplicate skill name "${normalizedSkill.name}"`);
		}
		seenNames.add(normalizedName);

		if (normalizedSkill.sourceDirectory) {
			if (seenSourceDirectories.has(normalizedSkill.sourceDirectory)) {
				throw new InvalidRuntimeSkillError(
					`Duplicate skill source directory "${normalizedSkill.sourceDirectory}"`,
				);
			}
			seenSourceDirectories.add(normalizedSkill.sourceDirectory);
		}

		return validation.skill;
	});
}

function toRegistryEntry(skill: RuntimeSkill): RuntimeSkillRegistryEntry {
	return {
		id: skill.id,
		name: skill.name,
		description: skill.description,
		hash: hashSkill(skill),
		linkedFiles: normalizeLinkedFiles(skill.linkedFiles),
		...(skill.recommendedTools ? { recommendedTools: skill.recommendedTools } : {}),
		...(skill.sourceName ? { sourceName: skill.sourceName } : {}),
		...(skill.path ? { path: skill.path } : {}),
		...(skill.sourcePath ? { sourcePath: skill.sourcePath } : {}),
		...(skill.directory ? { directory: skill.directory } : {}),
		...(skill.sourceDirectory ? { sourceDirectory: skill.sourceDirectory } : {}),
		...(skill.category ? { category: skill.category } : {}),
		...(skill.allowedTools ? { allowedTools: skill.allowedTools } : {}),
		...(skill.interface ? { interface: stableRecord(skill.interface) } : {}),
		...(skill.policy ? { policy: stableRecord(skill.policy) } : {}),
		...(skill.dependencies ? { dependencies: stableRecord(skill.dependencies) } : {}),
		...(skill.parents ? { parents: [...skill.parents] } : {}),
		...(skill.reference ? { reference: { ...skill.reference } } : {}),
		...(skill.sharedReferences ? { sharedReferences: [...skill.sharedReferences] } : {}),
		...(skill.version ? { version: skill.version } : {}),
		...(skill.license ? { license: skill.license } : {}),
		...(skill.compatibility ? { compatibility: skill.compatibility } : {}),
		...(skill.platforms ? { platforms: [...skill.platforms].sort() } : {}),
		...(skill.metadata ? { metadata: stableRecord(skill.metadata) } : {}),
	};
}

function hashSkill(skill: RuntimeSkill): string {
	// Keep hashes tied to skill content, not where or how that content was loaded.
	return hashJson({
		id: skill.id,
		name: skill.name,
		description: skill.description,
		instructions: skill.instructions,
		recommendedTools: skill.recommendedTools,
		allowedTools: skill.allowedTools,
		interface: skill.interface,
		policy: skill.policy,
		dependencies: skill.dependencies,
		parents: skill.parents,
		reference: skill.reference,
		sharedReferences: skill.sharedReferences,
		version: skill.version,
		license: skill.license,
		compatibility: skill.compatibility,
		platforms: skill.platforms,
		metadata: skill.metadata,
		linkedFiles: normalizeLinkedFiles(skill.linkedFiles),
	});
}

function validateRuntimeSkillFolder(
	skillDir: string,
	skillFile: string,
	sourceDirectory: string,
): void {
	const errors: string[] = [];

	if (lstatSync(skillDir).isSymbolicLink()) {
		errors.push(`Skill folder must not be a symlink: ${sourceDirectory}`);
	}

	const skillFileStat = lstatSync(skillFile);
	if (skillFileStat.isSymbolicLink()) {
		errors.push(`${RUNTIME_SKILL_FILE_NAME} must not be a symlink`);
	}
	if (!skillFileStat.isFile()) {
		errors.push(`${RUNTIME_SKILL_FILE_NAME} must be a regular file`);
	}

	const symlinks = collectSymlinks(skillDir);
	if (symlinks.length > 0) {
		errors.push(`Skill files must not include symlinks: ${symlinks.join(', ')}`);
	}

	if (errors.length > 0) {
		throw new InvalidRuntimeSkillError(`Invalid skill at ${sourceDirectory}: ${errors.join('; ')}`);
	}
}

function collectSkillFiles(rootDir: string): string[] {
	const out: string[] = [];
	walkSkillDirectories(rootDir, out);
	return out.sort();
}

function walkSkillDirectories(dir: string, out: string[]) {
	for (const entry of readdirSync(dir).sort()) {
		if (shouldIgnoreDirectory(entry)) continue;

		const absolutePath = join(dir, entry);
		const stat = lstatSync(absolutePath);
		if (!stat.isDirectory() || stat.isSymbolicLink()) continue;

		const skillFile = join(absolutePath, RUNTIME_SKILL_FILE_NAME);
		if (existsSync(skillFile)) {
			out.push(skillFile);
			continue;
		}

		walkSkillDirectories(absolutePath, out);
	}
}

function loadLinkedFiles(skillDir: string): RuntimeSkillLinkedFiles {
	const linkedFiles = emptyLinkedFiles();

	for (const abs of collectFiles(skillDir)) {
		const path = toPosixPath(relative(skillDir, abs));
		if (path === RUNTIME_SKILL_FILE_NAME) continue;

		linkedFiles[groupFor(path)].push({
			path,
			bytes: statSync(abs).size,
			sha256: createHash('sha256').update(readFileSync(abs)).digest('hex'),
		});
	}

	return normalizeLinkedFiles(linkedFiles);
}

function emptyLinkedFiles(): RuntimeSkillLinkedFiles {
	return {
		references: [],
		templates: [],
		scripts: [],
		assets: [],
		examples: [],
		other: [],
	};
}

function normalizeLinkedFiles(linkedFiles?: RuntimeSkillLinkedFiles): RuntimeSkillLinkedFiles {
	const normalized = emptyLinkedFiles();
	for (const group of [
		...RUNTIME_SKILL_LINKED_FILE_GROUPS,
		'other',
	] as RuntimeSkillLinkedFileGroup[]) {
		normalized[group] = [...(linkedFiles?.[group] ?? [])].sort(compareLinkedFiles);
	}
	return normalized;
}

function groupFor(relativePath: string): RuntimeSkillLinkedFileGroup {
	const topLevel = relativePath.split('/')[0];
	return isLinkedFileGroup(topLevel) ? topLevel : 'other';
}

function isLinkedFileGroup(
	value: string,
): value is (typeof RUNTIME_SKILL_LINKED_FILE_GROUPS)[number] {
	return RUNTIME_SKILL_LINKED_FILE_GROUPS.some((group) => group === value);
}

function findLinkedFile(
	linkedFiles: RuntimeSkillLinkedFiles | undefined,
	filePath: string,
): RuntimeSkillLinkedFile | undefined {
	const normalizedLinkedFiles = normalizeLinkedFiles(linkedFiles);
	for (const group of [
		...RUNTIME_SKILL_LINKED_FILE_GROUPS,
		'other',
	] as RuntimeSkillLinkedFileGroup[]) {
		const linkedFile = normalizedLinkedFiles[group].find((file) => file.path === filePath);
		if (linkedFile) return linkedFile;
	}
	return undefined;
}

function collectFiles(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir).sort()) {
		if (shouldIgnoreDirectory(entry)) continue;

		const absolutePath = join(dir, entry);
		const stat = lstatSync(absolutePath);
		if (stat.isSymbolicLink()) continue;
		if (stat.isDirectory()) {
			out.push(...collectFiles(absolutePath));
		} else if (stat.isFile()) {
			out.push(absolutePath);
		}
	}
	return out;
}

function collectSymlinks(rootDir: string, dir = rootDir): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir).sort()) {
		if (shouldIgnoreDirectory(entry)) continue;

		const absolutePath = join(dir, entry);
		const stat = lstatSync(absolutePath);
		const relativePath = toPosixPath(relative(rootDir, absolutePath));

		if (stat.isSymbolicLink()) {
			out.push(relativePath);
		} else if (stat.isDirectory()) {
			out.push(...collectSymlinks(rootDir, absolutePath));
		}
	}
	return out;
}

function shouldIgnoreDirectory(name: string): boolean {
	return name.startsWith('.') || name.startsWith('_') || IGNORED_DIRECTORIES.has(name);
}

function categoryFor(sourceDirectory: string): string | undefined {
	const parts = sourceDirectory.split('/');
	return parts.length > 1 ? parts.slice(0, -1).join('/') : undefined;
}

function compareRuntimeSkills(left: RuntimeSkill, right: RuntimeSkill) {
	return compareStrings(left.name, right.name) || compareStrings(left.id, right.id);
}

function compareRegistryEntries(left: RuntimeSkillRegistryEntry, right: RuntimeSkillRegistryEntry) {
	return compareStrings(left.name, right.name) || compareStrings(left.id, right.id);
}

function compareLinkedFiles(left: RuntimeSkillLinkedFile, right: RuntimeSkillLinkedFile) {
	return compareStrings(left.path, right.path);
}

function normalizeLinkedFilePath(filePath: string): string | null {
	if (filePath.trim() === '' || filePath.includes('\0') || filePath.includes('\\')) return null;
	if (filePath.startsWith('/')) return null;

	const normalizedPath = posix.normalize(filePath);
	if (normalizedPath === '.' || normalizedPath.startsWith('../')) return null;

	return normalizedPath;
}

function hashRegistry(skills: RuntimeSkillRegistryEntry[]): string {
	return hashJson({
		schemaVersion: RUNTIME_SKILL_REGISTRY_SCHEMA_VERSION,
		skills: skills.map(toRegistryHashEntry),
	});
}

function toRegistryHashEntry(skill: RuntimeSkillRegistryEntry) {
	return {
		id: skill.id,
		hash: skill.hash,
	};
}

function hashJson(value: unknown): string {
	return createHash('sha256')
		.update(JSON.stringify(stableClone(value)))
		.digest('hex')
		.slice(0, HASH_LENGTH);
}

function stableClone(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(stableClone);
	if (isRecord(value)) {
		return Object.fromEntries(
			Object.entries(value)
				.filter(([, entryValue]) => entryValue !== undefined)
				.sort(([left], [right]) => compareStrings(left, right))
				.map(([key, entryValue]) => [key, stableClone(entryValue)]),
		);
	}
	return value;
}

function compareStrings(left: string, right: string): number {
	if (left < right) return -1;
	if (left > right) return 1;
	return 0;
}

function stableRecord<T extends object>(value: T): T {
	return stableClone(value) as T;
}

function toPosixPath(path: string): string {
	return path.replaceAll('\\', '/');
}
