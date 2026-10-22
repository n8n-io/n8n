import {
	extendRuntimeSkillSource,
	RUNTIME_SKILL_MAX_OUTPUT_BYTES,
	validateRuntimeSkill,
	type RuntimeSkill,
	type RuntimeSkillSource,
	type Workspace,
} from '@n8n/agents';
import { skillNameKey } from '@n8n/api-types';
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

/** Resolve one turn before publishing its catalog. Never reuse content from another turn. */
export async function loadHubRunSkills(
	builtIns: RuntimeSkillSource,
	provider: AssistantSkillProvider,
	context: AssistantSkillContext,
): Promise<HubRunSkills> {
	try {
		if (!(await provider.isEnabled())) return { source: builtIns };
	} catch {
		// Keep the Assistant available when the rollout cannot be resolved.
		return { source: builtIns };
	}

	const unavailable: string[] = [];
	const candidates: Array<{ content: AssistantSkillContent; skill: RuntimeSkill }> = [];
	try {
		const summaries = await provider.listSkills(context);
		for (const summary of summaries) {
			try {
				const content = await provider.readSkill(context, summary.id);
				if (!content) continue;
				if (content.id !== summary.id) {
					unavailable.push(`${describeHubSkill(summary)}: the Hub returned a different skill ID.`);
					continue;
				}
				if (content.files.length > 0) {
					unavailable.push(
						`${describeHubSkill(content)}: unsupported attachments. The Assistant supports SKILL.md only.`,
					);
					continue;
				}
				const skill = toRuntimeSkill(content);
				if (
					!content.name.trim() ||
					!content.description.trim() ||
					!content.instructions.trim() ||
					!validateRuntimeSkill(skill).ok
				) {
					unavailable.push(`${describeHubSkill(content)}: invalid skill content.`);
					continue;
				}
				if (Buffer.byteLength(skill.instructions, 'utf8') > RUNTIME_SKILL_MAX_OUTPUT_BYTES) {
					unavailable.push(
						`${describeHubSkill(content)}: SKILL.md exceeds ${RUNTIME_SKILL_MAX_OUTPUT_BYTES} UTF-8 bytes.`,
					);
					continue;
				}
				candidates.push({ content, skill });
			} catch {
				unavailable.push(
					`${describeHubSkill(summary)}: Hub content could not be read. Do not use an earlier copy.`,
				);
			}
		}
	} catch {
		unavailable.push(
			'The Hub catalog could not be read. Hub skills are unavailable for this turn. Do not use earlier copies.',
		);
	}

	// Qualify only validated candidates. An unsupported skill cannot hide a valid one.
	const nameCounts = new Map<string, number>();
	for (const { skill } of candidates) {
		const key = skillNameKey(skill.name.normalize('NFKC'));
		nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
	}
	const names = new Set(
		builtIns.registry.skills.map(({ name }) => skillNameKey(name.normalize('NFKC'))),
	);
	const ids = new Set(builtIns.registry.skills.map(({ id }) => id));
	const accepted: RuntimeSkill[] = [];
	for (const { content, skill } of candidates) {
		if (ids.has(skill.id)) {
			unavailable.push(`${describeHubSkill(content)}: duplicate runtime skill ID.`);
			continue;
		}
		let key = skillNameKey(skill.name.normalize('NFKC'));
		if ((nameCounts.get(key) ?? 0) > 1 || names.has(key)) {
			skill.name = `${skill.name} (${skill.id})`;
			key = skillNameKey(skill.name.normalize('NFKC'));
		}
		if (names.has(key)) {
			unavailable.push(`${describeHubSkill(content)}: ambiguous runtime skill label.`);
			continue;
		}
		names.add(key);
		ids.add(skill.id);
		accepted.push(skill);
	}

	const source = extendRuntimeSkillSource(builtIns, accepted);
	const files = accepted.map((skill) => ({
		path: `${HUB_SKILL_DIRECTORY}/${skill.id}/SKILL.md`,
		content: skill.instructions,
	}));
	const notice = [
		...(accepted.length > 0
			? [
					'Hub skill labels include their scope. Load them by the exact skillId from the catalog. If the request does not distinguish matching skills, ask which one to use. Do not choose a scope by default.',
				]
			: []),
		...(unavailable.length > 0
			? [
					'These Hub skills are unavailable. If the request needs one, explain the reason. Do not claim to have applied its instructions:',
					...unavailable,
				]
			: []),
	].join('\n');

	return {
		source,
		...(notice ? { availabilityNotice: notice } : {}),
		prepareWorkspace: async (workspace) => {
			const filesystem = workspace.filesystem;
			if (!filesystem) throw new UnexpectedError('The skill workspace has no filesystem');
			// This directory belongs only to Hub skills. Clear it even after a provider failure.
			if (await filesystem.exists(HUB_SKILL_DIRECTORY)) {
				await filesystem.rmdir(HUB_SKILL_DIRECTORY, { recursive: true, force: true });
			}
			for (const file of files) {
				await filesystem.writeFile(file.path, file.content, { recursive: true, overwrite: true });
			}
		},
	};
}

function toRuntimeSkill(content: AssistantSkillContent): RuntimeSkill {
	// Only the immutable Hub ID contributes to the path. Names and versions cannot change it.
	const id = `hub-${createHash('sha256').update(content.id).digest('hex')}`;
	const scope = content.projectId === null ? 'Instance' : 'Current project';
	const path = `${HUB_SKILL_DIRECTORY}/${id}/SKILL.md`;
	const frontmatter = JSON.stringify({
		...content.frontmatter,
		name: content.name,
		description: content.description,
	});
	return {
		id,
		name: `${content.name} · ${scope}`,
		description: `${content.description}\nWorkspace file: ${path}`,
		instructions: scrubSecretsInText(`---\n${frontmatter}\n---\n\n${content.instructions}`),
		path,
		directory: `${HUB_SKILL_DIRECTORY}/${id}`,
		version: content.versionId,
		metadata: {
			hubSkillId: content.id,
			versionId: content.versionId,
			version: content.version,
			projectId: content.projectId,
		},
	};
}

function describeHubSkill(skill: AssistantSkillSummary): string {
	return JSON.stringify({
		skillId: skill.id,
		name: skill.name,
		scope: skill.projectId === null ? 'Instance' : 'Current project',
	});
}
