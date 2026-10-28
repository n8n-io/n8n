import { stringify as stringifyYaml } from 'yaml';

import type { AgentSkill } from '../types';

const SKILL_FILE_NAME = 'SKILL.md';

export type AgentSkillExport = {
	blob: Blob;
	fileName: string;
	format: 'markdown' | 'zip';
};

/** The SKILL.md text that the skill upload reads back: YAML frontmatter, then the instructions. */
export function agentSkillToMarkdown(skill: AgentSkill): string {
	const frontmatter = stringifyYaml({
		name: skill.name,
		description: skill.description,
		...(skill.allowedTools?.length ? { allowed_tools: skill.allowedTools } : {}),
	});
	return `---\n${frontmatter}---\n\n${skill.instructions.trim()}\n`;
}

/**
 * A lone SKILL.md, or a zip with a `<name>/` folder when the skill has reference files.
 * The upload reads the SKILL.md, or the folder once the zip is unzipped.
 */
export async function exportAgentSkill(skill: AgentSkill): Promise<AgentSkillExport> {
	const markdown = agentSkillToMarkdown(skill);
	const safeName = skill.name.trim().replace(/[\\/:*?"<>|]+/g, '-');
	// A name of only dots would make the archive paths point outside the skill folder.
	const baseName = /^\.*$/.test(safeName) ? 'skill' : safeName;
	const references = skill.references ?? [];

	if (references.length === 0) {
		return {
			blob: new Blob([markdown], { type: 'text/markdown' }),
			fileName: SKILL_FILE_NAME,
			format: 'markdown',
		};
	}

	const { strToU8, zipSync } = await import('fflate');
	const files: Record<string, Uint8Array> = {
		[`${baseName}/${SKILL_FILE_NAME}`]: strToU8(markdown),
	};
	for (const reference of references) {
		files[`${baseName}/${reference.path}`] = strToU8(reference.content);
	}
	return {
		blob: new Blob([zipSync(files)], { type: 'application/zip' }),
		fileName: `${baseName}.zip`,
		format: 'zip',
	};
}
