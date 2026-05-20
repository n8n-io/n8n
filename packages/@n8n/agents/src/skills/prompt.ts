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
				`- name: ${skill.name}`,
				`  description: ${skill.description}`,
				`  id: ${skill.id}`,
				...(skill.category ? [`  category: ${skill.category}`] : []),
				...(skill.recommendedTools?.length
					? [`  recommendedTools: ${skill.recommendedTools.join(', ')}`]
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
- Call skills_list when you need to inspect available categories or installed skill metadata.
- If one skill clearly matches, call skill_view once with that skill's name, then follow the returned content.
- If a loaded skill references a supporting file, call skill_view with that skill name and relative filePath.
- If the relevant skill was already loaded for this request, do not call skill_view again.
- If no skill clearly matches, do not call skill_view.
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
