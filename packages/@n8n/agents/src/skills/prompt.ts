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
			].join('\n'),
		)
		.join('\n');

	if (options.includeProtocol === false) return catalog;

	return `Skill loading protocol:
Skills are instruction packs, not execution tools. Match the user's request against skill names and descriptions below, then call load_skill before acting on a matched skill's guidance.

Available skills:
${catalog}

When deciding whether to load a skill:
- Match the user's request against the skill name, description, and category in the catalog above.
- Call load_skill with \`{ "skillId": "<id>" }\` for each matched skill, then follow the returned instructions. A single turn may load multiple skills when a loaded skill's instructions require chaining.
- When load_skill succeeds, that skill's recommended tools are activated automatically and become available on your next turn — do not call load_tools for them. Use search_tools and load_tools only for capabilities outside a loaded skill's recommended set.
- If a loaded skill references a supporting file, call load_skill with \`{ "skillId": "<id>", "filePath": "<relative path>" }\`.
- If the relevant skill was already loaded for this request, do not call load_skill again.
- If no skill clearly matches, do not call load_skill.
- Do not load a skill just because it is listed here.

Some tools are gated behind their owning skill and cannot be searched or loaded until that skill has been loaded. If a tool call is rejected with a gating error, load the named skill first and follow its instructions.`;
}

export function appendSkillCatalogToInstructions(
	instructions: string,
	registry: RuntimeSkillRegistry,
): string {
	const catalog = renderSkillCatalogPrompt(registry);
	if (!catalog) return instructions;

	// Catalog goes after the instructions so identity/mission anchors the top
	// of the prompt.
	const baseInstructions = instructions.trimEnd();
	return baseInstructions ? `${baseInstructions}\n\n${catalog}` : catalog;
}

function promptString(value: string): string {
	return JSON.stringify(value);
}
