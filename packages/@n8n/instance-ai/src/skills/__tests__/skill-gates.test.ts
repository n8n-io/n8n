import {
	CONFIG_EVALS_SKILL_ID,
	PROGRESSIVE_BUILDING_SKILL_ID,
	disabledInstanceAiSkillIds,
} from '../skill-gates';

describe('disabledInstanceAiSkillIds', () => {
	it('hides the config-evals skill when the flag is off', () => {
		expect(
			disabledInstanceAiSkillIds({ configEvalsEnabled: false, progressiveBuildingEnabled: true }),
		).toEqual([CONFIG_EVALS_SKILL_ID]);
	});

	it('hides the progressive-building skill when the mode is off', () => {
		expect(
			disabledInstanceAiSkillIds({ configEvalsEnabled: true, progressiveBuildingEnabled: false }),
		).toEqual([PROGRESSIVE_BUILDING_SKILL_ID]);
	});

	it('hides nothing when all flags are on', () => {
		expect(
			disabledInstanceAiSkillIds({ configEvalsEnabled: true, progressiveBuildingEnabled: true }),
		).toEqual([]);
	});
});
