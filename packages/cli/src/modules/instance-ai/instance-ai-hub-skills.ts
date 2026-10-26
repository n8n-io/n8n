import {
	RUNTIME_SKILL_MAX_OUTPUT_BYTES,
	hashRuntimeSkillRegistry,
	type RuntimeSkillLoadError,
	type RuntimeSkillContent,
	type RuntimeSkillFileContent,
	type RuntimeSkillRegistryEntry,
	type RuntimeSkillSource,
} from '@n8n/agents';
import {
	AGENT_SKILL_REFERENCE_MAX_COUNT,
	agentSkillReferencePathSchema,
	skillNameKey,
	type InstanceAiEvent,
} from '@n8n/api-types';
import type {
	AssistantSkillContent,
	AssistantSkillContext,
	AssistantSkillFileContent,
	AssistantSkillProvider,
	AssistantSkillSummary,
} from '@n8n/backend-services';
import { scrubSecretsInText } from '@n8n/utils/scrub-secrets';
import { createHash } from 'node:crypto';

import { createHubSkillDisplayMapper } from './instance-ai-skill-display';

const HUB_SKILL_DIRECTORY = '.n8n/skills/hub';
const HUB_SKILL_ID_PREFIX = 'hub-';
const HUB_UNAVAILABLE_NOTICE = 'Hub skills are temporarily unavailable. Do not use earlier copies.';

export interface HubRunSkills {
	source: RuntimeSkillSource;
	availabilityNotice?: string;
	mapSkillEventForDisplay?: (event: InstanceAiEvent) => InstanceAiEvent;
}

type LoadedHubSkill = RuntimeSkillContent & Pick<RuntimeSkillRegistryEntry, 'hash' | 'linkedFiles'>;

export async function loadHubRunSkills(
	builtIns: RuntimeSkillSource,
	provider: AssistantSkillProvider,
	context: AssistantSkillContext,
): Promise<HubRunSkills> {
	const enabled = await provider.isEnabled().catch(() => false);
	if (!enabled) return { source: builtIns };
	const summaries = await provider.listSkills(context).catch(() => null);
	return createDeferredHubSource(builtIns, provider, context, summaries);
}

function createDeferredHubSource(
	builtIns: RuntimeSkillSource,
	provider: AssistantSkillProvider,
	context: AssistantSkillContext,
	summaries: AssistantSkillSummary[] | null,
): HubRunSkills {
	const hubSkills = createHubCatalog(builtIns, summaries ?? []);
	const entries = [...hubSkills.values()].map(({ entry }) => entry);
	const pending = new Map<string, Promise<LoadedHubSkill | null>>();
	const loaded = new Map<string, LoadedHubSkill>();
	const errors = new Map<string, RuntimeSkillLoadError>();
	const load = async (id: string) => {
		const selected = hubSkills.get(id);
		if (!selected) return null;
		const { summary, entry } = selected;
		let result = pending.get(id);
		if (!result) {
			result = readHubSkill(provider, context, summary, entry).then((skill) => {
				if ('message' in skill) {
					errors.set(id, skill);
					if (skill.retryable) pending.delete(id);
					return null;
				}
				errors.delete(id);
				entry.linkedFiles = skill.linkedFiles;
				loaded.set(id, skill);
				return skill;
			});
			pending.set(id, result);
		}
		return await result;
	};

	const mergedRegistry = () => {
		if (entries.length === 0) return builtIns.registry;
		const skills = [...builtIns.registry.skills, ...entries];
		return { ...builtIns.registry, skills, skillsHash: hashRuntimeSkillRegistry(skills) };
	};
	const source: RuntimeSkillSource = {
		...builtIns,
		registry: mergedRegistry(),
		loadSkill: async (id) => (hubSkills.has(id) ? await load(id) : await builtIns.loadSkill(id)),
		loadFile: async (id, path) => {
			const selected = hubSkills.get(id);
			if (!selected) return (await builtIns.loadFile?.(id, path)) ?? null;
			const skill = await load(id);
			if (!skill?.linkedFiles.references.some((file) => file.path === path)) return null;
			const file = await readHubReference(provider, context, selected.summary, id, path);
			if ('message' in file) {
				errors.set(id, file);
				return null;
			}
			errors.delete(id);
			return file;
		},
		getLoadError: (id) => {
			if (
				summaries === null &&
				id.startsWith(HUB_SKILL_ID_PREFIX) &&
				!builtIns.registry.skills.some((entry) => entry.id === id)
			)
				return { message: HUB_UNAVAILABLE_NOTICE, retryable: true };
			return errors.get(id) ?? builtIns.getLoadError?.(id);
		},
	};

	if (builtIns.prepare) {
		source.prepare = async () => {
			await builtIns.prepare?.();
			source.registry = mergedRegistry();
		};
	}

	return {
		source,
		mapSkillEventForDisplay: createHubSkillDisplayMapper(loaded),
		availabilityNotice:
			summaries === null
				? HUB_UNAVAILABLE_NOTICE
				: entries.length > 0
					? 'Hub skill labels include their scope. Paths under .n8n/skills/hub are virtual skill identifiers, not workspace files. Load by exact skillId. Read references with load_skill and a relative filePath from linkedFiles. If multiple available skills match the request and the intended skill is unclear, ask which skill to use.'
					: undefined,
	};
}

function createHubCatalog(builtIns: RuntimeSkillSource, summaries: AssistantSkillSummary[]) {
	const knownIds = new Set(builtIns.registry.skills.map(({ id }) => id));
	const catalog = new Map<
		string,
		{ summary: AssistantSkillSummary; entry: RuntimeSkillRegistryEntry }
	>();
	for (const summary of summaries) {
		const entry = toRegistryEntry(summary);
		if (knownIds.has(entry.id) || !summary.name.trim() || !summary.description.trim()) continue;
		knownIds.add(entry.id);
		catalog.set(entry.id, { summary, entry });
	}
	const names = new Set(builtIns.registry.skills.map(({ name }) => nameKey(name)));
	const counts = new Map<string, number>();
	for (const { entry } of catalog.values())
		counts.set(nameKey(entry.name), (counts.get(nameKey(entry.name)) ?? 0) + 1);
	for (const { entry } of catalog.values()) {
		if ((counts.get(nameKey(entry.name)) ?? 0) > 1 || names.has(nameKey(entry.name))) {
			entry.name = `${entry.name} (${entry.id})`;
		}
		names.add(nameKey(entry.name));
	}
	return catalog;
}

async function readHubSkill(
	provider: AssistantSkillProvider,
	context: AssistantSkillContext,
	summary: AssistantSkillSummary,
	entry: RuntimeSkillRegistryEntry,
): Promise<LoadedHubSkill | RuntimeSkillLoadError> {
	let content: AssistantSkillContent | null;
	try {
		content = await provider.readSkill(context, summary.id, summary.versionId);
	} catch {
		return {
			message: 'Hub content could not be loaded. Do not use an earlier copy.',
			retryable: true,
		};
	}
	if (!content)
		return {
			message: 'This Hub skill is no longer available. Do not use an earlier copy.',
			retryable: false,
		};
	if (content.id !== summary.id || content.versionId !== summary.versionId) {
		return {
			message: 'The Hub did not return the version listed for this turn.',
			retryable: false,
		};
	}
	return prepareSkill(entry, content);
}

async function readHubReference(
	provider: AssistantSkillProvider,
	context: AssistantSkillContext,
	summary: AssistantSkillSummary,
	skillId: string,
	path: string,
): Promise<RuntimeSkillFileContent | RuntimeSkillLoadError> {
	let file: AssistantSkillFileContent | null;
	try {
		file = await provider.readFile(context, summary.id, summary.versionId, path);
	} catch {
		return {
			message: 'Hub reference content could not be loaded. Do not use an earlier copy.',
			retryable: true,
		};
	}
	if (
		!file ||
		file.skillId !== summary.id ||
		file.versionId !== summary.versionId ||
		file.path !== path
	) {
		return {
			message:
				'This Hub reference is unavailable for the selected version. Do not use an earlier copy.',
			retryable: false,
		};
	}
	const content = scrubSecretsInText(file.content);
	const bytes = Buffer.byteLength(content, 'utf8');
	if (bytes === 0) return { message: 'This Hub reference is empty.', retryable: false };
	if (bytes > RUNTIME_SKILL_MAX_OUTPUT_BYTES) {
		return {
			message: `This reference exceeds ${RUNTIME_SKILL_MAX_OUTPUT_BYTES} UTF-8 bytes.`,
			retryable: false,
		};
	}
	return { skillId, filePath: path, content, bytes, sha256: hash(content) };
}

function toRegistryEntry(summary: AssistantSkillSummary): RuntimeSkillRegistryEntry {
	const id = `${HUB_SKILL_ID_PREFIX}${hash(summary.id)}`;
	const scope = summary.projectId === null ? 'Instance' : 'Current project';
	const directory = `${HUB_SKILL_DIRECTORY}/${id}`;
	return {
		id,
		name: `${summary.name} · ${scope}`,
		description: `${summary.description}\nVirtual skill path (use load_skill): ${directory}/SKILL.md`,
		hash: summary.versionId,
		version: summary.versionId,
		path: `${directory}/SKILL.md`,
		directory,
		metadata: {
			hubSkillId: summary.id,
			versionId: summary.versionId,
			version: summary.version,
			projectId: summary.projectId,
		},
		linkedFiles: {
			references: [],
			templates: [],
			scripts: [],
			assets: [],
			examples: [],
			other: [],
		},
	};
}

function prepareSkill(
	entry: RuntimeSkillRegistryEntry,
	content: AssistantSkillContent,
): LoadedHubSkill | RuntimeSkillLoadError {
	if (!content.name.trim() || !content.description.trim() || !content.instructions.trim()) {
		return { message: 'This Hub skill has invalid instructions or metadata.', retryable: false };
	}
	const paths = content.files.map(({ path }) => path);
	if (
		paths.length > AGENT_SKILL_REFERENCE_MAX_COUNT ||
		new Set(paths).size !== paths.length ||
		paths.some(
			(path) => !agentSkillReferencePathSchema.safeParse(path).success || path.includes('\0'),
		)
	) {
		return {
			message:
				'Unsupported or invalid references. Use Markdown files under references/ within the custom Agent reference limits.',
			retryable: false,
		};
	}
	const frontmatter = JSON.stringify({
		...content.frontmatter,
		name: content.name,
		description: content.description,
	});
	const instructions = scrubSecretsInText(`---\n${frontmatter}\n---\n\n${content.instructions}`);
	if (Buffer.byteLength(instructions, 'utf8') > RUNTIME_SKILL_MAX_OUTPUT_BYTES) {
		return {
			message: `This skill exceeds ${RUNTIME_SKILL_MAX_OUTPUT_BYTES} UTF-8 bytes.`,
			retryable: false,
		};
	}
	return {
		...entry,
		instructions,
		linkedFiles: { ...entry.linkedFiles, references: paths.map((path) => ({ path })) },
	};
}

function hash(value: string): string {
	return createHash('sha256').update(value).digest('hex');
}

function nameKey(value: string): string {
	return skillNameKey(value.normalize('NFKC'));
}
