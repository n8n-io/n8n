import { AgentBuilderAdminSettingsUpdateDto, agentBuilderAdminSettingsSchema } from '../agents';

describe('AgentBuilderAdminSettingsUpdateDto', () => {
	describe('valid payloads', () => {
		test.each([
			{ name: 'mode=default', payload: { mode: 'default' } },
			{
				name: 'mode=custom anthropic',
				payload: {
					mode: 'custom',
					provider: 'anthropic',
					credentialId: 'cred-1',
					modelName: 'claude-3-5-sonnet',
				},
			},
			{
				name: 'mode=custom openai with arbitrary provider id (api-types stays runtime-agnostic)',
				payload: {
					mode: 'custom',
					provider: 'openai',
					credentialId: 'cred-1',
					modelName: 'gpt-4o',
				},
			},
			{
				name: 'mode=custom aws-bedrock',
				payload: {
					mode: 'custom',
					provider: 'aws-bedrock',
					credentialId: 'cred-1',
					modelName: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
				},
			},
		])('parses $name', ({ payload }) => {
			expect(AgentBuilderAdminSettingsUpdateDto.safeParse(payload).success).toBe(true);
		});
	});

	describe('invalid payloads', () => {
		test.each([
			{ name: 'missing mode', payload: {} },
			{ name: 'unknown mode', payload: { mode: 'foo' } },
			{
				name: 'mode=custom missing provider',
				payload: { mode: 'custom', credentialId: 'cred-1', modelName: 'm' },
			},
			{
				name: 'mode=custom missing credentialId',
				payload: { mode: 'custom', provider: 'anthropic', modelName: 'm' },
			},
			{
				name: 'mode=custom missing modelName',
				payload: { mode: 'custom', provider: 'anthropic', credentialId: 'cred-1' },
			},
			{
				name: 'mode=custom empty modelName',
				payload: {
					mode: 'custom',
					provider: 'anthropic',
					credentialId: 'cred-1',
					modelName: '',
				},
			},
			{
				name: 'mode=custom empty provider',
				payload: {
					mode: 'custom',
					provider: '',
					credentialId: 'cred-1',
					modelName: 'claude-3-5-sonnet',
				},
			},
			{
				name: 'mode=default with extra custom fields is silently stripped (still parses)',
				payload: { mode: 'default', provider: 'anthropic' },
				expectsSuccess: true,
			},
		])('$name', ({ payload, expectsSuccess = false }) => {
			expect(AgentBuilderAdminSettingsUpdateDto.safeParse(payload).success).toBe(expectsSuccess);
		});
	});

	it('inferred type alias matches the schema', () => {
		// Compile-time assertion: the discriminator narrows the type.
		const sample = AgentBuilderAdminSettingsUpdateDto.parse({ mode: 'default' });
		if (sample.mode === 'default') {
			// no extra fields
			expect(Object.keys(sample)).toEqual(['mode']);
		}
	});

	it('agentBuilderAdminSettingsSchema is the same schema as the DTO export', () => {
		expect(AgentBuilderAdminSettingsUpdateDto).toBe(agentBuilderAdminSettingsSchema);
	});
});
