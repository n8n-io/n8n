import type { AgentSkill } from '@n8n/api-types';
import {
	RUNTIME_SKILL_LINKED_FILE_GROUPS,
	RUNTIME_SKILL_REGISTRY_SCHEMA_VERSION,
	createRuntimeSkillRegistry,
	type RuntimeSkill,
	type RuntimeSkillFileContent,
	type RuntimeSkillLinkedFile,
	type RuntimeSkillLinkedFileGroup,
	type RuntimeSkillLinkedFiles,
	type RuntimeSkillRegistry,
	type RuntimeSkillRegistryEntry,
	type RuntimeSkillSource,
} from '@n8n/agents';
import { createHash } from 'node:crypto';
import { normalize as posixNormalize } from 'node:path/posix';

export type AgentSkillBundleFile = {
	content: string;
	bytes: number;
	sha256: string;
};

export type AgentSkillBundle = AgentSkill & {
	allowedTools?: string[];
	permissions?: { env?: string[]; network?: string[] };
	version?: string;
	license?: string;
	compatibility?: string;
	metadata?: Record<string, unknown>;
	linkedFiles?: RuntimeSkillLinkedFiles;
	files?: Record<string, AgentSkillBundleFile>;
};

const LINKED_FILE_GROUPS = [
	...RUNTIME_SKILL_LINKED_FILE_GROUPS,
	'other',
] as const satisfies readonly RuntimeSkillLinkedFileGroup[];

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

function groupFor(filePath: string): RuntimeSkillLinkedFileGroup {
	const topLevel = filePath.split('/')[0];
	return LINKED_FILE_GROUPS.includes(topLevel as RuntimeSkillLinkedFileGroup)
		? (topLevel as RuntimeSkillLinkedFileGroup)
		: 'other';
}

function normalizeLinkedFilePath(filePath: string): string | null {
	if (filePath.trim() === '' || filePath.includes('\0') || filePath.includes('\\')) return null;
	if (filePath.startsWith('/')) return null;

	const normalizedPath = posixNormalize(filePath);
	if (normalizedPath === '.' || normalizedPath.startsWith('../')) return null;

	return normalizedPath;
}

function linkedFilesFromFiles(
	files: AgentSkillBundle['files'],
): RuntimeSkillLinkedFiles | undefined {
	if (!files || Object.keys(files).length === 0) return undefined;

	const linkedFiles = emptyLinkedFiles();
	for (const [rawPath, file] of Object.entries(files)) {
		const filePath = normalizeLinkedFilePath(rawPath);
		if (!filePath) continue;
		const entry: RuntimeSkillLinkedFile = {
			path: filePath,
			bytes: file.bytes,
			sha256: file.sha256,
		};
		linkedFiles[groupFor(filePath)].push(entry);
	}

	return linkedFiles;
}

function toRuntimeSkill(id: string, skill: AgentSkill | AgentSkillBundle): RuntimeSkill {
	const bundle = skill as AgentSkillBundle;
	return {
		id,
		name: skill.name,
		description: skill.description,
		instructions: skill.instructions,
		allowedTools: bundle.allowedTools,
		version: bundle.version,
		license: bundle.license,
		compatibility: bundle.compatibility,
		metadata: bundle.metadata,
		linkedFiles: bundle.linkedFiles ?? linkedFilesFromFiles(bundle.files),
	};
}

function hashJson(value: unknown): string {
	return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function mergeRuntimeSkillRegistries(entries: RuntimeSkillRegistryEntry[]): RuntimeSkillRegistry {
	return {
		schemaVersion: RUNTIME_SKILL_REGISTRY_SCHEMA_VERSION,
		skills: entries,
		skillsHash: hashJson({
			schemaVersion: RUNTIME_SKILL_REGISTRY_SCHEMA_VERSION,
			skills: entries.map((entry) => ({
				id: entry.id,
				hash: entry.hash,
				linkedFiles: entry.linkedFiles,
			})),
		}),
	};
}

export function createDbRuntimeSkillSource(
	skills: Record<string, AgentSkill | AgentSkillBundle> = {},
): RuntimeSkillSource {
	const runtimeSkills = Object.entries(skills).map(([id, skill]) => toRuntimeSkill(id, skill));
	const registry = createRuntimeSkillRegistry(runtimeSkills);
	const skillsById = new Map(runtimeSkills.map((skill) => [skill.id, skill]));

	return {
		registry,
		loadSkill: async (skillId) => skillsById.get(skillId) ?? null,
		loadFile: async (skillId, filePath): Promise<RuntimeSkillFileContent | null> => {
			const rawSkill = skills[skillId] as AgentSkillBundle | undefined;
			const normalizedPath = normalizeLinkedFilePath(filePath);
			if (!rawSkill?.files || !normalizedPath) return null;

			const file = rawSkill.files[normalizedPath];
			if (!file) return null;

			return {
				skillId,
				filePath: normalizedPath,
				content: file.content,
				bytes: file.bytes,
				sha256: file.sha256,
			};
		},
	};
}

export function mergeRuntimeSkillSources(
	...sources: Array<RuntimeSkillSource | undefined>
): RuntimeSkillSource {
	const orderedSources = sources.filter(
		(source): source is RuntimeSkillSource => source !== undefined,
	);
	const entries: RuntimeSkillRegistryEntry[] = [];
	const sourceBySkillId = new Map<string, RuntimeSkillSource>();

	for (const source of orderedSources) {
		for (const entry of source.registry.skills) {
			if (sourceBySkillId.has(entry.id)) continue;
			sourceBySkillId.set(entry.id, source);
			entries.push(entry);
		}
	}

	return {
		registry: mergeRuntimeSkillRegistries(entries),
		prepare: async () => {
			await Promise.all(orderedSources.map(async (source) => await source.prepare?.()));
		},
		loadSkill: async (skillId) => (await sourceBySkillId.get(skillId)?.loadSkill(skillId)) ?? null,
		loadFile: async (skillId, filePath) =>
			(await sourceBySkillId.get(skillId)?.loadFile?.(skillId, filePath)) ?? null,
	};
}
