import {
	RUNTIME_SKILL_MAX_OUTPUT_BYTES,
	type RuntimeSkillContent,
	type RuntimeSkillFileContent,
	type RuntimeSkillRegistryEntry,
	type RuntimeSkillSource,
} from '@n8n/agents';
import {
	AGENT_SKILL_REFERENCE_MAX_COUNT,
	agentSkillReferencePathSchema,
	skillNameKey,
} from '@n8n/api-types';
import type {
	AssistantSkillContent,
	AssistantSkillContext,
	AssistantSkillProvider,
	AssistantSkillSummary,
} from '@n8n/backend-services';
import { scrubSecretsInText } from '@n8n/utils/scrub-secrets';
import { createHash } from 'node:crypto';

const HUB_SKILL_DIRECTORY = '.n8n/skills/hub';

export interface HubRunSkills {
	source: RuntimeSkillSource;
	availabilityNotice?: string;
}

type LoadedHubSkill = RuntimeSkillContent & Pick<RuntimeSkillRegistryEntry, 'linkedFiles'>;

/** Discover metadata only. Each turn resolves its selected versions on demand. */
export async function loadHubRunSkills(
	builtIns: RuntimeSkillSource,
	provider: AssistantSkillProvider,
	context: AssistantSkillContext,
): Promise<HubRunSkills> {
	try {
		if (!(await provider.isEnabled())) return { source: builtIns };
	} catch {
		return { source: builtIns };
	}

	let summaries: AssistantSkillSummary[] = [];
	let availabilityNotice: string | undefined;
	try {
		summaries = await provider.listSkills(context);
	} catch {
		availabilityNotice = 'Hub skills are unavailable for this turn. Do not use earlier copies.';
	}

	return createDeferredHubSource(builtIns, provider, context, summaries, availabilityNotice);
}

function createDeferredHubSource(
	builtIns: RuntimeSkillSource,
	provider: AssistantSkillProvider,
	context: AssistantSkillContext,
	summaries: AssistantSkillSummary[],
	availabilityNotice?: string,
): HubRunSkills {
	const { entries, selectedSummaries } = createHubCatalog(builtIns, summaries);
	const summariesById = new Map(
		entries.map((entry, index) => [entry.id, selectedSummaries[index]]),
	);
	const entriesById = new Map(entries.map((entry) => [entry.id, entry]));
	const pending = new Map<string, Promise<LoadedHubSkill | null>>();
	const errors = new Map<string, string>();
	const load = async (id: string) => {
		const summary = summariesById.get(id);
		const entry = entriesById.get(id);
		if (!summary || !entry) return null;
		let result = pending.get(id);
		if (!result) {
			result = readHubSkill(provider, context, summary, entry).then((skill) => {
				if (typeof skill === 'string') {
					errors.set(id, skill);
					return null;
				}
				entry.linkedFiles = skill.linkedFiles;
				return skill;
			});
			pending.set(id, result);
		}
		return await result;
	};

	const hubHash = hash(JSON.stringify(entries));
	const mergedRegistry = () => ({
		...builtIns.registry,
		skills: [...builtIns.registry.skills, ...entries],
		skillsHash: hash(JSON.stringify([builtIns.registry.skillsHash, hubHash])),
	});
	const source: RuntimeSkillSource = {
		...builtIns,
		registry: mergedRegistry(),
		loadSkill: async (id) =>
			summariesById.has(id) ? await load(id) : await builtIns.loadSkill(id),
		loadFile: async (id, path) => {
			const summary = summariesById.get(id);
			if (!summary) return (await builtIns.loadFile?.(id, path)) ?? null;
			const skill = await load(id);
			if (!skill?.linkedFiles.references.some((file) => file.path === path)) return null;
			const file = await readHubReference(provider, context, summary, id, path);
			if (typeof file === 'string') {
				errors.set(id, file);
				return null;
			}
			errors.delete(id);
			return file;
		},
		getLoadError: (id) => errors.get(id) ?? builtIns.getLoadError?.(id),
	};

	if (builtIns.prepare) {
		source.prepare = async () => {
			await builtIns.prepare?.();
			source.registry = mergedRegistry();
		};
	}

	return {
		source,
		availabilityNotice:
			availabilityNotice ??
			(entries.length > 0
				? 'Hub skill labels include their scope. Paths under .n8n/skills/hub are virtual skill identifiers, not workspace files. Load by exact skillId. Read references with load_skill and a relative filePath from linkedFiles. If matching skills are ambiguous, ask which one to use. Do not choose a scope by default.'
				: undefined),
	};
}

function createHubCatalog(builtIns: RuntimeSkillSource, summaries: AssistantSkillSummary[]) {
	const knownIds = new Set(builtIns.registry.skills.map(({ id }) => id));
	summaries = summaries.filter((summary) => {
		const id = `hub-${hash(summary.id)}`;
		if (knownIds.has(id) || !summary.name.trim() || !summary.description.trim()) return false;
		knownIds.add(id);
		return true;
	});
	const entries = summaries.map(toRegistryEntry);
	const names = new Set(builtIns.registry.skills.map(({ name }) => nameKey(name)));
	const counts = new Map<string, number>();
	for (const entry of entries)
		counts.set(nameKey(entry.name), (counts.get(nameKey(entry.name)) ?? 0) + 1);
	for (const entry of entries) {
		if ((counts.get(nameKey(entry.name)) ?? 0) > 1 || names.has(nameKey(entry.name))) {
			entry.name = `${entry.name} (${entry.id})`;
		}
		names.add(nameKey(entry.name));
	}
	return { entries, selectedSummaries: summaries };
}

async function readHubSkill(
	provider: AssistantSkillProvider,
	context: AssistantSkillContext,
	summary: AssistantSkillSummary,
	entry: RuntimeSkillRegistryEntry,
): Promise<LoadedHubSkill | string> {
	try {
		const content = await provider.readSkill(context, summary.id, summary.versionId);
		if (!content) return 'This Hub skill is no longer available. Do not use an earlier copy.';
		if (content.id !== summary.id || content.versionId !== summary.versionId) {
			return 'The Hub did not return the version listed for this turn.';
		}
		return prepareSkill(entry, content);
	} catch {
		return 'Hub content could not be loaded. Do not use an earlier copy.';
	}
}

async function readHubReference(
	provider: AssistantSkillProvider,
	context: AssistantSkillContext,
	summary: AssistantSkillSummary,
	skillId: string,
	path: string,
): Promise<RuntimeSkillFileContent | string> {
	try {
		const file = await provider.readFile(context, summary.id, summary.versionId, path);
		if (
			!file ||
			file.skillId !== summary.id ||
			file.versionId !== summary.versionId ||
			file.path !== path
		) {
			return 'This Hub reference is unavailable for the selected version. Do not use an earlier copy.';
		}
		const content = scrubSecretsInText(file.content);
		const bytes = Buffer.byteLength(content, 'utf8');
		if (bytes === 0) return 'This Hub reference is empty.';
		if (bytes > RUNTIME_SKILL_MAX_OUTPUT_BYTES) {
			return `This reference exceeds ${RUNTIME_SKILL_MAX_OUTPUT_BYTES} UTF-8 bytes.`;
		}
		return { skillId, filePath: path, content, bytes, sha256: hash(content) };
	} catch {
		return 'Hub reference content could not be loaded. Do not use an earlier copy.';
	}
}

function toRegistryEntry(summary: AssistantSkillSummary): RuntimeSkillRegistryEntry {
	const id = `hub-${hash(summary.id)}`;
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
): LoadedHubSkill | string {
	if (!content.name.trim() || !content.description.trim() || !content.instructions.trim()) {
		return 'This Hub skill has invalid instructions or metadata.';
	}
	const paths = content.files.map(({ path }) => path);
	if (
		paths.length > AGENT_SKILL_REFERENCE_MAX_COUNT ||
		new Set(paths).size !== paths.length ||
		paths.some(
			(path) => !agentSkillReferencePathSchema.safeParse(path).success || path.includes('\0'),
		)
	) {
		return 'Unsupported or invalid references. Use Markdown files under references/ within the custom Agent reference limits.';
	}
	const frontmatter = JSON.stringify({
		...content.frontmatter,
		name: content.name,
		description: content.description,
	});
	const instructions = scrubSecretsInText(`---\n${frontmatter}\n---\n\n${content.instructions}`);
	if (Buffer.byteLength(instructions, 'utf8') > RUNTIME_SKILL_MAX_OUTPUT_BYTES) {
		return `This skill exceeds ${RUNTIME_SKILL_MAX_OUTPUT_BYTES} UTF-8 bytes.`;
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
