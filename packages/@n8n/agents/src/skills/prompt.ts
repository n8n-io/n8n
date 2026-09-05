import type { RuntimeSkillRegistry } from './types';

export interface RenderSkillCatalogOptions {
	includeProtocol?: boolean;
}

export function renderSkillCatalogPrompt(
	registry: RuntimeSkillRegistry,
	options: RenderSkillCatalogOptions = {},
): string {
	if (registry.skills.length === 0) return '';

	const catalog = registry.skills
		.map((skill) =>
			[
				`- name: ${promptString(skill.name)}`,
				`  description: ${promptString(skill.description)}`,
				`  id: ${promptString(skill.id)}`,
				...(skill.category ? [`  category: ${promptString(skill.category)}`] : []),
				...(skill.recommendedTools?.length
					? [`  recommendedTools: ${promptStringArray(skill.recommendedTools)}`]
					: []),
			].join('\n'),
		)
		.join('\n');

	if (options.includeProtocol === false) return catalog;

	return `Skill loading protocol:
Skills provide task-specific instructions, not execution tools. Follow a relevant skill when the agent instructions or the task require it.

Available skills:
${catalog}

When deciding whether to load a skill:
- Match the user's request against the skill name and description.
- If a skill clearly matches and its instructions are not already available, call load_skill with \`{ "skillId": "<id>" }\`, then follow the returned instructions.
- If a loaded skill references a supporting file, call load_skill with \`{ "skillId": "<id>", "filePath": "<relative path>" }\`.
- Reuse the same skill version while its instructions remain available in context, including inline tool results. Reload when the instructions are missing or the version changes. Load a supporting file when its specific guidance is needed.
- If no skill clearly matches, do not call load_skill.
- Do not load a skill just because it is listed here.`;
}

export function appendSkillCatalogToInstructions(
	instructions: string,
	registry: RuntimeSkillRegistry,
	options: RenderSkillCatalogOptions = {},
): string {
	const catalog = renderSkillCatalogPrompt(registry, options);
	if (!catalog) return instructions;

	const baseInstructions = instructions.trimEnd();
	return baseInstructions ? `${catalog}\n\n${baseInstructions}` : catalog;
}

function promptString(value: string): string {
	return JSON.stringify(value);
}

function promptStringArray(value: string[]): string {
	return JSON.stringify(value);
}
