import {
	AGENT_BUILDING_SKILL_IDS,
	CONFIG_EVAL_PLAYBOOK_SKILL_ID,
	CONFIG_EVALS_SKILL_ID,
	INSTANCE_AWARENESS_SKILL_ID,
	disabledInstanceAiSkillIds,
} from '../skill-gates';

describe('disabledInstanceAiSkillIds', () => {
	it('does not change prompt-profile capabilities', () => {
		const disabled = disabledInstanceAiSkillIds({
			configEvalsEnabled: true,
			instanceContextEnabled: true,
			agentBuildingEnabled: true,
		});
		expect(disabled).toEqual([]);
	});

	it.each([true, false])('preserves the evaluation skill gate (enabled=%s)', (enabled) => {
		const disabled = disabledInstanceAiSkillIds({
			configEvalsEnabled: enabled,
			instanceContextEnabled: true,
			agentBuildingEnabled: true,
		});
		expect(disabled.includes(CONFIG_EVALS_SKILL_ID)).toBe(!enabled);
		expect(disabled.includes(CONFIG_EVAL_PLAYBOOK_SKILL_ID)).toBe(!enabled);
	});

	it('hides the instance-awareness skill when the reader is off', () => {
		expect(
			disabledInstanceAiSkillIds({
				configEvalsEnabled: true,
				instanceContextEnabled: false,
				agentBuildingEnabled: true,
			}),
		).toEqual([INSTANCE_AWARENESS_SKILL_ID]);
	});

	it('keeps all feature-gated skills when all flags are on', () => {
		expect(
			disabledInstanceAiSkillIds({
				configEvalsEnabled: true,
				instanceContextEnabled: true,
				agentBuildingEnabled: true,
			}),
		).toEqual([]);
	});

	it('hides the Agents module skills when the module is not active', () => {
		expect(
			disabledInstanceAiSkillIds({
				configEvalsEnabled: true,
				instanceContextEnabled: true,
				agentBuildingEnabled: false,
			}),
		).toEqual([...AGENT_BUILDING_SKILL_IDS]);
	});
});
