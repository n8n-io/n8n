import { agentSkillSchema } from '@n8n/api-types';
import { describe, expect, it } from 'vitest';

import { RECOMMENDED_SKILLS } from './recommendedSkills';

const SOURCES = {
	humanizer:
		'Based on humanizer by Siqi Chen, MIT License. Source: https://github.com/blader/humanizer',
	'cold-email':
		'Based on cold-email by Corey Haines, MIT License. Source: https://github.com/coreyhaines31/marketingskills/tree/main/skills/cold-email',
	research:
		'Based on research by Matt Pocock, MIT License. Source: https://github.com/mattpocock/skills/tree/main/skills/engineering/research',
};

describe('RECOMMENDED_SKILLS', () => {
	it.each(RECOMMENDED_SKILLS.map((recommended) => [recommended.id, recommended]))(
		'loads %s as a skill that the server accepts',
		async (_id, recommended) => {
			const skill = await recommended.load();

			expect(agentSkillSchema.safeParse(skill).error).toBeUndefined();
			expect(skill.name).toBe(recommended.name);
			expect(skill.description).not.toContain('\n');
		},
	);

	it.each(RECOMMENDED_SKILLS.map((recommended) => [recommended.id, recommended]))(
		'ends the instructions of %s with the license notice',
		async (id, recommended) => {
			const skill = await recommended.load();

			expect(skill.instructions.split('\n').at(-1)).toBe(SOURCES[id]);
		},
	);

	it.each(RECOMMENDED_SKILLS.map((recommended) => [recommended.id, recommended]))(
		'shows the source of %s that its license notice names',
		(id, recommended) => {
			expect(SOURCES[id].endsWith(`Source: ${recommended.source.url}`)).toBe(true);
			expect(recommended.source.url).toContain(`github.com/${recommended.source.label}`);
		},
	);

	it('keeps only the reference files that the cold-email instructions link to', async () => {
		const coldEmail = RECOMMENDED_SKILLS.find(({ id }) => id === 'cold-email');
		const skill = await coldEmail!.load();
		const linked = [...skill.instructions.matchAll(/\]\((references\/[^)]+)\)/g)].map(
			([, path]) => path,
		);

		expect(skill.references?.map(({ path }) => path).sort()).toEqual([...new Set(linked)].sort());
		expect(skill.references).toHaveLength(4);
	});
});
