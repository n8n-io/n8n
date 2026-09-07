import {
	CONFIG_EVALS_SKILL_ID,
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
			});
			expect(disabled).toContain(PROGRESSIVE_BUILDING_SKILL_ID);
			expect(disabled.includes(PLANNING_SKILL_ID)).toBe(enabled);
		},
	);

	it.each([true, false])('preserves the evaluation skill gate (enabled=%s)', (enabled) => {
		const disabled = disabledInstanceAiSkillIds({
			configEvalsEnabled: enabled,
			progressiveBuildingEnabled: false,
		});
		expect(disabled.includes(CONFIG_EVALS_SKILL_ID)).toBe(!enabled);
	});
});
