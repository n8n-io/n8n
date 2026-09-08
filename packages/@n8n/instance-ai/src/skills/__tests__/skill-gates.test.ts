import {
	CONFIG_EVALS_SKILL_ID,
	INSTANCE_AWARENESS_SKILL_ID,
	PLANNING_SKILL_ID,
	PROGRESSIVE_BUILDING_SKILL_ID,
	disabledInstanceAiSkillIds,
} from '../skill-gates';

describe('disabledInstanceAiSkillIds', () => {
	it.each([true, false])(
		'keeps the host-injected policy out of the catalog (progressive=%s)',
		(enabled) => {
			const disabled = disabledInstanceAiSkillIds({
				configEvalsEnabled: true,
				progressiveBuildingEnabled: enabled,
				instanceContextEnabled: true,
			});
			expect(disabled).toContain(PROGRESSIVE_BUILDING_SKILL_ID);
			expect(disabled.includes(PLANNING_SKILL_ID)).toBe(enabled);
		},
	);

	it.each([true, false])('preserves the evaluation skill gate (enabled=%s)', (enabled) => {
		const disabled = disabledInstanceAiSkillIds({
			configEvalsEnabled: enabled,
			progressiveBuildingEnabled: false,
			instanceContextEnabled: true,
		});
		expect(disabled.includes(CONFIG_EVALS_SKILL_ID)).toBe(!enabled);
	});

	it('hides the instance-awareness skill when the reader is off', () => {
		expect(
			disabledInstanceAiSkillIds({
				configEvalsEnabled: true,
				progressiveBuildingEnabled: false,
				instanceContextEnabled: false,
			}),
		).toEqual([PROGRESSIVE_BUILDING_SKILL_ID, INSTANCE_AWARENESS_SKILL_ID]);
	});

	it('keeps only the injected policy and planning hidden when all flags are on', () => {
		expect(
			disabledInstanceAiSkillIds({
				configEvalsEnabled: true,
				progressiveBuildingEnabled: true,
				instanceContextEnabled: true,
			}),
		).toEqual([PROGRESSIVE_BUILDING_SKILL_ID, PLANNING_SKILL_ID]);
	});
});
