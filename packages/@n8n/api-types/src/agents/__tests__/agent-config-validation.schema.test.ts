import { agentConfigValidationWarningSchema } from '../agent-config-validation.schema';

describe('agentConfigValidationWarningSchema', () => {
	const warning = { code: 'similar_skill_names', capability: { kind: 'skill' } };

	it('accepts a similar_skill_names warning with two names', () => {
		expect(
			agentConfigValidationWarningSchema.safeParse({ ...warning, names: ['Tone', 'tone'] }).success,
		).toBe(true);
	});

	it.each([[[]], [['Tone']], [['Tone', '']]])('rejects the names %j', (names) => {
		expect(agentConfigValidationWarningSchema.safeParse({ ...warning, names }).success).toBe(false);
	});
});
