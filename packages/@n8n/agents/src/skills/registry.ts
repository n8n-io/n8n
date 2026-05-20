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

export function loadRuntimeSkillSourceFromDirectory(rootDir: string): RuntimeSkillSource {
	const skills = loadRuntimeSkillsFromDirectory(rootDir);
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

	return collectSkillFiles(rootDir).map((skillPath) => {
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

		return {
			...parsed.skill,
			linkedFiles: loadLinkedFiles(skillDir),
		};
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
	const sortedSkills = [...skills].sort(compareRuntimeSkills);
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
		...(skill.version ? { version: skill.version } : {}),
		...(skill.license ? { license: skill.license } : {}),
		...(skill.compatibility ? { compatibility: skill.compatibility } : {}),
		...(skill.platforms ? { platforms: [...skill.platforms].sort() } : {}),
		...(skill.metadata ? { metadata: stableRecord(skill.metadata) } : {}),
	};
}

function hashSkill(skill: RuntimeSkill): string {
	return hashJson({
		id: skill.id,
		name: skill.name,
		description: skill.description,
		instructions: skill.instructions,
		recommendedTools: skill.recommendedTools,
		sourceName: skill.sourceName,
		path: skill.path,
		sourcePath: skill.sourcePath,
		directory: skill.directory,
		sourceDirectory: skill.sourceDirectory,
		category: skill.category,
		allowedTools: skill.allowedTools,
		interface: skill.interface,
		policy: skill.policy,
		dependencies: skill.dependencies,
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
	return left.name.localeCompare(right.name) || left.id.localeCompare(right.id);
}

function compareRegistryEntries(left: RuntimeSkillRegistryEntry, right: RuntimeSkillRegistryEntry) {
	return left.name.localeCompare(right.name) || left.id.localeCompare(right.id);
}

function compareLinkedFiles(left: RuntimeSkillLinkedFile, right: RuntimeSkillLinkedFile) {
	return left.path.localeCompare(right.path);
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
		skills,
	});
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
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([key, entryValue]) => [key, stableClone(entryValue)]),
		);
	}
	return value;
}

function stableRecord<T extends object>(value: T): T {
	return stableClone(value) as T;
}

function toPosixPath(path: string): string {
	return path.replaceAll('\\', '/');
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
