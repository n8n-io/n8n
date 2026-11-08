import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { WORKFLOW_BUILDER_GOTCHAS } from '../gotchas/workflow-builder.gotchas';
import { applySkillGotchas, listGotchaIds, parseAblatedGotchas } from '../skill-gotchas';
import { INSTANCE_AI_SKILLS_DIR, loadInstanceAiSkills } from '../skills';

const rawSkill = readFileSync(join(INSTANCE_AI_SKILLS_DIR, 'workflow-builder', 'SKILL.md'), 'utf8');

describe('skill gotchas', () => {
	it('keeps the workflow-builder ledger in sync with the skill', () => {
		const ids = listGotchaIds(rawSkill);
		expect(new Set(ids).size).toBe(ids.length);
		expect([...ids].sort()).toEqual(WORKFLOW_BUILDER_GOTCHAS.map((g) => g.id).sort());
	});

	it('strips markers from the loaded skill', async () => {
		const skill = await loadInstanceAiSkills().loadSkill('workflow-builder');
		expect(skill?.instructions).not.toContain('<!-- gotcha:');
	});

	it('removes ablated lines and keeps the rest', () => {
		const text = 'a\n- one <!-- gotcha:one -->\n- two <!-- gotcha:two -->';
		expect(applySkillGotchas(text, parseAblatedGotchas('one'))).toBe('a\n- two');
		expect(applySkillGotchas(text, parseAblatedGotchas('*'))).toBe('a');
		expect(applySkillGotchas(text, new Set())).toBe('a\n- one\n- two');
	});
});
