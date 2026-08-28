import {
	CONFIG_EVALS_SKILL_ID,
	PLANNING_SKILL_ID,
	PROGRESSIVE_BUILDING_SKILL_ID,
	disabledInstanceAiSkillIds,
} from '../skill-gates';

describe('disabledInstanceAiSkillIds', () => {
	it('hides the config-evals skill when the flag is off', () => {
		expect(
			disabledInstanceAiSkillIds({ configEvalsEnabled: false, progressiveBuildingEnabled: false }),
		).toEqual([CONFIG_EVALS_SKILL_ID, PROGRESSIVE_BUILDING_SKILL_ID]);
	});

	it('hides the progressive-building skill when the mode is off', () => {
		expect(
			disabledInstanceAiSkillIds({ configEvalsEnabled: true, progressiveBuildingEnabled: false }),
		).toEqual([PROGRESSIVE_BUILDING_SKILL_ID]);
	});

	it('hides the planning skill while progressive building is on — planned tasks bypass the execution gate', () => {
		expect(
			disabledInstanceAiSkillIds({ configEvalsEnabled: true, progressiveBuildingEnabled: true }),
		).toEqual([PLANNING_SKILL_ID]);
	});

	it('never hides planning and progressive-building at the same time', () => {
		for (const configEvalsEnabled of [true, false]) {
			for (const progressiveBuildingEnabled of [true, false]) {
				const disabled = disabledInstanceAiSkillIds({
					configEvalsEnabled,
					progressiveBuildingEnabled,
				});
				expect(
					disabled.includes(PLANNING_SKILL_ID) && disabled.includes(PROGRESSIVE_BUILDING_SKILL_ID),
				).toBe(false);
			}
		}
	});
});
