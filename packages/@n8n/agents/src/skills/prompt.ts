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
				...(skill.recommendedTools?.length
					? [`  recommendedTools: ${promptStringArray(skill.recommendedTools)}`]
					: []),
			].join('\n'),
		)
		.join('\n');

	if (options.includeProtocol === false) return catalog;

	return `Skill loading protocol:
Skills are instruction packs, not execution tools. Load one only when it is relevant to the current request.

Available skills:
${catalog}

How to load skills:
- Match the request against each skill's name and description. Do not load a skill only because it is listed.
- Load a skill with \`load_skill({ "skillId": "<id>" })\`, then follow its instructions.
- When several skills match, load all of them in the same response with parallel load_skill calls. Do not wait for one to return before loading the next.
- You can make read-only lookups that the request clearly needs in that same response.
- Load a supporting file with \`load_skill({ "skillId": "<id>", "filePath": "<relative path>" })\`.${
		hasReferences
			? `
- A loaded skill can list references, each with a description of when it applies. Load a reference with \`load_skill({ "skillId": "<reference id>" })\` when its description matches the current step. If you already know it will match, load it together with its parent skill.`
			: ''
	}
- Do not reload a skill that is already loaded for this request.`;
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
