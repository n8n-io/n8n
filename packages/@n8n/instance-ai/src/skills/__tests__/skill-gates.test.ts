import {
	CONFIG_EVALS_SKILL_ID,
	INSTANCE_AWARENESS_SKILL_ID,
	PROGRESSIVE_BUILDING_SKILL_ID,
	disabledInstanceAiSkillIds,
} from '../skill-gates';

describe('disabledInstanceAiSkillIds', () => {
	it('keeps the policy fragment out of the catalog and retains planning', () => {
		const disabled = disabledInstanceAiSkillIds({
			configEvalsEnabled: true,
			instanceContextEnabled: true,
		});
		expect(disabled).toContain(PROGRESSIVE_BUILDING_SKILL_ID);
		expect(disabled).not.toContain('planning');
	});

	it.each([true, false])('preserves the evaluation skill gate (enabled=%s)', (enabled) => {
		const disabled = disabledInstanceAiSkillIds({
			configEvalsEnabled: enabled,
			instanceContextEnabled: true,
		});
		expect(disabled.includes(CONFIG_EVALS_SKILL_ID)).toBe(!enabled);
	});

	it('hides the instance-awareness skill when the reader is off', () => {
		expect(
			disabledInstanceAiSkillIds({
				configEvalsEnabled: true,
				instanceContextEnabled: false,
			}),
		).toEqual([PROGRESSIVE_BUILDING_SKILL_ID, INSTANCE_AWARENESS_SKILL_ID]);
	});

	it('keeps only the policy fragment hidden when all flags are on', () => {
		expect(
			disabledInstanceAiSkillIds({
				configEvalsEnabled: true,
				instanceContextEnabled: true,
			}),
		).toEqual([PROGRESSIVE_BUILDING_SKILL_ID]);
	});
});
