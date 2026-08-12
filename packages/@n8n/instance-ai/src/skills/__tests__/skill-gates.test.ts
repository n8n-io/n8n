import {
	CONFIG_EVALS_SKILL_ID,
	disabledInstanceAiSkillIds,
	ONE_OFF_TASK_SKILL_ID,
} from '../skill-gates';

describe('disabledInstanceAiSkillIds', () => {
	it('hides the config-evals skill when the flag is off', () => {
		expect(
			disabledInstanceAiSkillIds({ configEvalsEnabled: false, oneOffTasksEnabled: true }),
		).toEqual([CONFIG_EVALS_SKILL_ID]);
	});

	it('hides the one-off-task skill when the flag is off', () => {
		expect(
			disabledInstanceAiSkillIds({ configEvalsEnabled: true, oneOffTasksEnabled: false }),
		).toEqual([ONE_OFF_TASK_SKILL_ID]);
	});

	it('hides nothing when all flags are on', () => {
		expect(
			disabledInstanceAiSkillIds({ configEvalsEnabled: true, oneOffTasksEnabled: true }),
		).toEqual([]);
	});
});
