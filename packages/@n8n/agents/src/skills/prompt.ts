import type { RuntimeSkillRegistry } from './types';

export interface RenderSkillCatalogOptions {
	includeProtocol?: boolean;
}

export function renderSkillCatalogPrompt(
	registry: RuntimeSkillRegistry,
	options: RenderSkillCatalogOptions = {},
): string {
	const topLevel = registry.skills.filter((skill) => !skill.parents);
	if (topLevel.length === 0) return '';
	const hasReferences = topLevel.length < registry.skills.length;

	const catalog = topLevel
		.map((skill) =>
			[
				// Folder skills derive the id from the name, so the name adds nothing.
				// Generated ids need the name to be readable.
				...(skill.name === skill.id
					? [`- id: ${promptString(skill.id)}`, `  description: ${promptString(skill.description)}`]
					: [
							`- name: ${promptString(skill.name)}`,
							`  description: ${promptString(skill.description)}`,
							`  id: ${promptString(skill.id)}`,
						]),
				...(skill.category ? [`  category: ${promptString(skill.category)}`] : []),
				...(skill.recommendedMode
					? [`  recommendedMode: ${promptString(skill.recommendedMode)}`]
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
- If one skill clearly matches, call load_skill once with \`{ "skillId": "<id>" }\`, then follow the returned instructions.
- If a loaded skill references a supporting file, call load_skill with \`{ "skillId": "<id>", "filePath": "<relative path>" }\`.${
		hasReferences
			? `
- A loaded skill can list references with a description of when each applies. Load a reference with \`{ "skillId": "<reference id>" }\` only when its description matches the current step.`
			: ''
	}
- If no skill clearly matches, do not call load_skill.`;
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
