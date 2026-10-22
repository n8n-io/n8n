import {
	RUNTIME_SKILL_MAX_OUTPUT_BYTES,
	type RuntimeSkillContent,
	type RuntimeSkillFileContent,
	type RuntimeSkillRegistryEntry,
	type RuntimeSkillSource,
	type Workspace,
	type WorkspaceFilesystem,
} from '@n8n/agents';
import { agentSkillShape, skillNameKey } from '@n8n/api-types';
import type {
	AssistantSkillContent,
	AssistantSkillContext,
	AssistantSkillProvider,
	AssistantSkillSummary,
} from '@n8n/backend-services';
import { scrubSecretsInText } from '@n8n/utils/scrub-secrets';
import { createHash } from 'node:crypto';
import { UnexpectedError } from 'n8n-workflow';

const HUB_SKILL_DIRECTORY = '.n8n/skills/hub';

export interface HubRunSkills {
	source: RuntimeSkillSource;
	availabilityNotice?: string;
	prepareWorkspace?: (workspace: Workspace) => Promise<void>;
}

type LoadedHubSkill = {
	skill: RuntimeSkillContent & Pick<RuntimeSkillRegistryEntry, 'linkedFiles'>;
	files: RuntimeSkillFileContent[];
};

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
	const summariesById = new Map(entries.map((entry, index) => [entry.id, summaries[index]]));
	const entriesById = new Map(entries.map((entry) => [entry.id, entry]));
	const pending = new Map<string, Promise<LoadedHubSkill | null>>();
	const loaded = new Map<string, LoadedHubSkill>();
	const errors = new Map<string, string>();
	let filesystem: WorkspaceFilesystem | undefined;

	const writeSkill = async (target: WorkspaceFilesystem, snapshot: LoadedHubSkill) => {
		for (const file of snapshot.files) {
			await target.writeFile(
				`${HUB_SKILL_DIRECTORY}/${file.skillId}/${file.filePath}`,
				file.content,
				{
					recursive: true,
					overwrite: true,
				},
			);
		}
	};
	const resolveSkill = async (id: string): Promise<LoadedHubSkill | null> => {
		const summary = summariesById.get(id);
		const entry = entriesById.get(id);
		if (!summary || !entry) return null;
		try {
			const content = await provider.readSkill(context, summary.id, summary.versionId);
			if (!content) {
				errors.set(id, 'This Hub skill is no longer available. Do not use an earlier copy.');
				return null;
			}
			if (content.id !== summary.id || content.versionId !== summary.versionId) {
				errors.set(id, 'The Hub did not return the version listed for this turn.');
				return null;
			}
			const snapshot = prepareSkill(entry, content);
			if (typeof snapshot === 'string') {
				errors.set(id, snapshot);
				return null;
			}
			if (filesystem) await writeSkill(filesystem, snapshot);
			// Activation exposes paths. Reference bodies stay behind loadFile.
			entry.linkedFiles = snapshot.skill.linkedFiles;
			loaded.set(id, snapshot);
			return snapshot;
		} catch {
			errors.set(id, 'Hub content could not be loaded. Do not use an earlier copy.');
			return null;
		}
	};
	const load = async (id: string) => {
		let result = pending.get(id);
		if (!result) {
			result = resolveSkill(id);
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
			summariesById.has(id) ? ((await load(id))?.skill ?? null) : await builtIns.loadSkill(id),
		loadFile: async (id, path) => {
			if (!summariesById.has(id)) return (await builtIns.loadFile?.(id, path)) ?? null;
			return (await load(id))?.files.find((file) => file.filePath === path) ?? null;
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
				? 'Hub skill labels include their scope. Load by exact skillId before reading workspace files. If matching skills are ambiguous, ask which one to use. Do not choose a scope by default.'
				: undefined),
		prepareWorkspace: async (workspace) => {
			const target = workspace.filesystem;
			if (!target) throw new UnexpectedError('The skill workspace has no filesystem');
			if (await target.exists(HUB_SKILL_DIRECTORY)) {
				await target.rmdir(HUB_SKILL_DIRECTORY, { recursive: true, force: true });
			}
			filesystem = target;
			for (const snapshot of loaded.values()) await writeSkill(target, snapshot);
		},
	};
}

function toRegistryEntry(summary: AssistantSkillSummary): RuntimeSkillRegistryEntry {
	const id = `hub-${hash(summary.id)}`;
	const scope = summary.projectId === null ? 'Instance' : 'Current project';
	const directory = `${HUB_SKILL_DIRECTORY}/${id}`;
	return {
		id,
		name: `${summary.name} · ${scope}`,
		description: `${summary.description}\nWorkspace file after load_skill: ${directory}/SKILL.md`,
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
	if (
		!agentSkillShape.references.safeParse(content.files).success ||
		content.files.some(({ path }) => path.includes('\0'))
	) {
		return 'Unsupported or invalid references. Use Markdown files under references/ within the custom Agent reference limits.';
	}
	const frontmatter = JSON.stringify({
		...content.frontmatter,
		name: content.name,
		description: content.description,
	});
	const files = [
		{ path: 'SKILL.md', content: `---\n${frontmatter}\n---\n\n${content.instructions}` },
		...content.files,
	].map((file) => {
		const text = scrubSecretsInText(file.content);
		return {
			skillId: entry.id,
			filePath: file.path,
			content: text,
			bytes: Buffer.byteLength(text, 'utf8'),
			sha256: hash(text),
		};
	});
	if (files.some(({ bytes }) => bytes > RUNTIME_SKILL_MAX_OUTPUT_BYTES)) {
		return `This skill contains a file above ${RUNTIME_SKILL_MAX_OUTPUT_BYTES} UTF-8 bytes.`;
	}
	const linkedFiles = {
		...entry.linkedFiles,
		references: files
			.slice(1)
			.map(({ filePath, bytes, sha256 }) => ({ path: filePath, bytes, sha256 })),
	};
	return { skill: { ...entry, instructions: files[0].content, linkedFiles }, files };
}

function hash(value: string): string {
	return createHash('sha256').update(value).digest('hex');
}

function nameKey(value: string): string {
	return skillNameKey(value.normalize('NFKC'));
}
