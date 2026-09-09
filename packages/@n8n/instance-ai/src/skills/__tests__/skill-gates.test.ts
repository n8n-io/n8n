import {
	CONFIG_EVALS_SKILL_ID,
	disabledInstanceAiSkillIds,
	INSTANCE_AWARENESS_SKILL_ID,
} from '../skill-gates';

describe('disabledInstanceAiSkillIds', () => {
	const allOn = { configEvalsEnabled: true, instanceContextEnabled: true };

	it('hides the config-evals skill when the flag is off', () => {
		expect(disabledInstanceAiSkillIds({ ...allOn, configEvalsEnabled: false })).toEqual([
			CONFIG_EVALS_SKILL_ID,
		]);
	});

	/** The skill is entirely about a block and a tool that do not exist with the reader off. */
	it('hides the instance-awareness skill when the reader is off', () => {
		expect(disabledInstanceAiSkillIds({ ...allOn, instanceContextEnabled: false })).toEqual([
			INSTANCE_AWARENESS_SKILL_ID,
		]);
	});

	it('hides nothing when every flag is on', () => {
		expect(disabledInstanceAiSkillIds(allOn)).toEqual([]);
	});
});
