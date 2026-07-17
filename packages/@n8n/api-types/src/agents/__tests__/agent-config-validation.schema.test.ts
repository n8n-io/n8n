import { agentConfigValidationResponseSchema } from '../agent-config-validation.schema';

describe('agentConfigValidationResponseSchema', () => {
	it('accepts valid and invalid responses with structured issues', () => {
		expect(
			agentConfigValidationResponseSchema.safeParse({ status: 'valid', issues: [] }).success,
		).toBe(true);

		const result = agentConfigValidationResponseSchema.safeParse({
			status: 'invalid',
			issues: [
				{
					code: 'missing_credential',
					path: 'credential',
					capability: { kind: 'agent' },
				},
				{
					code: 'missing_credential',
					path: 'tools.0.node.credentials.openAiApi',
					capability: { kind: 'tool', id: 'search_web', index: 0, toolType: 'node' },
				},
				{
					code: 'missing_reference',
					path: 'skill:skill_abc',
					capability: { kind: 'skill', id: 'skill_abc' },
				},
			],
		});

		expect(result.success).toBe(true);
	});

	it('rejects unknown enum values in code, kind, toolType, and status', () => {
		expect(
			agentConfigValidationResponseSchema.safeParse({
				status: 'invalid',
				issues: [{ code: 'not_a_real_code', path: 'model', capability: { kind: 'agent' } }],
			}).success,
		).toBe(false);

		expect(
			agentConfigValidationResponseSchema.safeParse({
				status: 'invalid',
				issues: [
					{ code: 'missing_required', path: 'model', capability: { kind: 'not_a_real_kind' } },
				],
			}).success,
		).toBe(false);

		expect(
			agentConfigValidationResponseSchema.safeParse({
				status: 'invalid',
				issues: [
					{
						code: 'missing_credential',
						path: 'tools.0.node.credentials.openAiApi',
						capability: { kind: 'tool', toolType: 'not_a_real_type' },
					},
				],
			}).success,
		).toBe(false);

		expect(
			agentConfigValidationResponseSchema.safeParse({ status: 'ok', issues: [] }).success,
		).toBe(false);
	});
});
