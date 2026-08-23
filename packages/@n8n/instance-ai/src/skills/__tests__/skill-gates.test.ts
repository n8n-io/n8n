import { CONFIG_EVALS_SKILL_ID, disabledInstanceAiSkillIds } from '../skill-gates';

describe('disabledInstanceAiSkillIds', () => {
	it('hides the config-evals skill when the flag is off', () => {
		expect(disabledInstanceAiSkillIds({ configEvalsEnabled: false })).toEqual([
			CONFIG_EVALS_SKILL_ID,
		]);
	});

	it('hides nothing when the config-evals flag is on', () => {
		expect(disabledInstanceAiSkillIds({ configEvalsEnabled: true })).toEqual([]);
	});
});
