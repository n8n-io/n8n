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
Skills are instruction packs, not execution tools. Match the user's request against skill names and descriptions below, then call load_skill before acting on a matched skill's guidance.

Available skills:
${catalog}

When deciding whether to load a skill:
- Match the user's request against the skill name, description, and category in the catalog above.
- Call load_skill with \`{ "skillId": "<id>" }\` for each matched skill, then follow the returned instructions. A single turn may load multiple skills when descriptions require chaining (e.g. data-table-manager then workflow-builder).
- Immediately after each successful load_skill for a skill you will act on, call load_tools with that skill's recommendedTools before any other deferred tool from that skill.
- If a loaded skill references a supporting file, call load_skill with \`{ "skillId": "<id>", "filePath": "<relative path>" }\`.
- If the relevant skill was already loaded for this request, do not call load_skill again.
- If no skill clearly matches, do not call load_skill.
- Do not load a skill just because it is listed here.

Tool gates (always): never call data-tables or parse-file without loading data-table-manager first; never call build-workflow without loading workflow-builder first. After load_skill, call load_tools with that skill's recommendedTools before calling gated tools.`;
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
