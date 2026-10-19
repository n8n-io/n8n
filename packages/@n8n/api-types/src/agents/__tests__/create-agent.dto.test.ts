import { CreateAgentDto } from '../dto';

describe('CreateAgentDto', () => {
	it.each([
		{},
		{ config: { instructions: 'Help users' } },
		{ schema: { name: 'Source', model: '', instructions: '' } },
	])('accepts a draft, initial config, or duplication schema: %j', (configuration) => {
		expect(CreateAgentDto.parse({ name: 'Agent', ...configuration })).toMatchObject(configuration);
	});

	it('rejects initial config combined with a duplication schema', () => {
		const request = {
			name: 'Agent',
			config: { instructions: 'Help users' },
			schema: { name: 'Source', model: '', instructions: '' },
		};
		expect(CreateAgentDto.safeParse(request).success).toBe(false);
		expect(() => new CreateAgentDto(request)).toThrow(
			'Use config for initial configuration or schema for duplication, not both.',
		);
	});
});
