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
Skills are optional instruction packs, not execution tools. Use them to get extra guidance only when they are relevant to the user's current request.

Available skills:
${catalog}

When deciding whether to load a skill:
- Match the user's request against the skill name and description.
- Call list_skills when you need to inspect available categories or installed skill metadata.
- If one skill clearly matches, call load_skill once with \`{ "skillId": "<id>" }\`, then follow the returned instructions.
- If a loaded skill references a supporting file, call load_skill with \`{ "skillId": "<id>", "filePath": "<relative path>" }\`.
- If the relevant skill was already loaded for this request, do not call load_skill again.
- If no skill clearly matches, do not call load_skill.
- Do not load a skill just because it is listed here.`;
}

export function appendSkillCatalogToInstructions(
	instructions: string,
	registry: RuntimeSkillRegistry,
): string {
	const catalog = renderSkillCatalogPrompt(registry);
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
