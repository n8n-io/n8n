import { loadInstanceAiRuntimeSkillSource } from '@n8n/instance-ai';

import { getBuilderRuntimeSkills } from '../index';

// The builder skills are the source of truth. Their bodies have been copied
// verbatim into the single `agent-builder` instance-ai skill as reference files
// (`references/<x>.md`), and their routing descriptions into that skill's main
// SKILL.md (the tools they reference are ported separately). This guards that
// copy against drift: if a builder skill's body or any value it interpolates
// (sub-agent limits, the MCP config schema, the skill/task templates) changes,
// the reference file must be updated to match; if its description changes, the
// SKILL.md routing must be updated.
const PORTED_SKILL_ID = 'agent-builder';

// Maps each builder skill id to its reference file inside the agent-builder skill.
const referenceFileFor = (skillId: string): string =>
	`references/${skillId.replace(/^agent-builder-/, '')}.md`;

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

describe('agent-builder skills ported to instance-ai', () => {
	const source = loadInstanceAiRuntimeSkillSource();

	test.each(getBuilderRuntimeSkills())(
		'$id body is copied verbatim into its reference file',
		async (builderSkill) => {
			const file = await source.loadFile?.(PORTED_SKILL_ID, referenceFileFor(builderSkill.id));

			expect(file).toBeTruthy();
			expect(file?.content.trim()).toBe(builderSkill.instructions.trim());
		},
	);

	test('main SKILL.md routes to every builder skill', async () => {
		const ported = await source.loadSkill(PORTED_SKILL_ID);
		expect(ported).not.toBeNull();

		const body = normalizeWhitespace(ported?.instructions ?? '');
		for (const builderSkill of getBuilderRuntimeSkills()) {
			expect(body).toContain(normalizeWhitespace(builderSkill.description));
			expect(ported?.instructions).toContain(referenceFileFor(builderSkill.id));
		}
	});
});
