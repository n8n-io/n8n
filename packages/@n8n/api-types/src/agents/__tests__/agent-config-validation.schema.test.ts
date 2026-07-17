import { agentConfigValidationResponseSchema } from '../agent-config-validation.schema';

describe('agentConfigValidationResponseSchema', () => {
	it('accepts a valid response with no issues', () => {
		const result = agentConfigValidationResponseSchema.safeParse({
			status: 'valid',
			issues: [],
		});

		expect(result.success).toBe(true);
	});

	it('accepts an invalid response with structured issues', () => {
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

	it('rejects an unknown issue code', () => {
		const result = agentConfigValidationResponseSchema.safeParse({
			status: 'invalid',
			issues: [{ code: 'not_a_real_code', path: 'model', capability: { kind: 'agent' } }],
		});

		expect(result.success).toBe(false);
	});

	it('rejects an unknown capability kind', () => {
		const result = agentConfigValidationResponseSchema.safeParse({
			status: 'invalid',
			issues: [
				{ code: 'missing_required', path: 'model', capability: { kind: 'not_a_real_kind' } },
			],
		});

		expect(result.success).toBe(false);
	});

	it('rejects an unknown tool type', () => {
		const result = agentConfigValidationResponseSchema.safeParse({
			status: 'invalid',
			issues: [
				{
					code: 'missing_credential',
					path: 'tools.0.node.credentials.openAiApi',
					capability: { kind: 'tool', toolType: 'not_a_real_type' },
				},
			],
		});

		expect(result.success).toBe(false);
	});

	it('rejects an unknown status', () => {
		const result = agentConfigValidationResponseSchema.safeParse({ status: 'ok', issues: [] });

		expect(result.success).toBe(false);
	});
});
