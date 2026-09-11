import {
	CONFIG_EVALS_SKILL_ID,
	INSTANCE_AWARENESS_SKILL_ID,
	disabledInstanceAiSkillIds,
} from '../skill-gates';

describe('disabledInstanceAiSkillIds', () => {
	it('does not change prompt-profile capabilities', () => {
		const disabled = disabledInstanceAiSkillIds({
			configEvalsEnabled: true,
			instanceContextEnabled: true,
		});
		expect(disabled).toEqual([]);
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
		).toEqual([INSTANCE_AWARENESS_SKILL_ID]);
	});

	it('keeps all feature-gated skills when all flags are on', () => {
		expect(
			disabledInstanceAiSkillIds({
				configEvalsEnabled: true,
				instanceContextEnabled: true,
			}),
		).toEqual([]);
	});
});
