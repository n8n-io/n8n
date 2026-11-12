import { CreateAgentPublicDto } from '../create-agent-public.dto';
import { CreateAgentDto } from '../dto';

describe('CreateAgentDto', () => {
	it.each([
		{},
		{ config: { name: 'Agent', model: '', instructions: 'Help users' } },
		{ schema: { name: 'Source', model: '', instructions: '' } },
	])('accepts a draft, initial config, or duplication schema: %j', (configuration) => {
		const request = { name: 'Agent', ...configuration };
		expect(CreateAgentDto.parse(request)).toMatchObject(request);
		expect(CreateAgentDto.schema.parse(request)).toMatchObject(request);
		expect(new CreateAgentDto(request)).toMatchObject(request);
	});

	it('rejects initial config combined with a duplication schema', () => {
		const request = {
			name: 'Agent',
			config: { name: 'Agent', model: '', instructions: 'Help users' },
			schema: { name: 'Source', model: '', instructions: '' },
		};
		expect(CreateAgentDto.safeParse(request).success).toBe(false);
		expect(CreateAgentDto.schema.safeParse(request).success).toBe(false);
		expect(() => new CreateAgentDto(request)).toThrow(
			'Use config for initial configuration or schema for duplication, not both.',
		);
	});
});

const config = { name: 'Agent', model: '', instructions: 'Help users' };

describe('CreateAgentPublicDto', () => {
	it('accepts an empty draft', () => {
		expect(CreateAgentPublicDto.parse({ name: 'Agent' })).toEqual({ name: 'Agent' });
	});

	it('uses the same config schema as internal creation', () => {
		const body = { name: 'Agent', config };
		expect(CreateAgentPublicDto.parse(body).config).toEqual(CreateAgentDto.parse(body).config);
	});

	it.each([
		{ model: null },
		{ instructions: 123 },
		{ tools: [{ type: 'unknown' }] },
		{ memory: { enabled: 'yes' } },
	])('rejects invalid configuration in both endpoints: %j', (invalid) => {
		const body = { name: 'Agent', config: { ...config, ...invalid } };
		expect(CreateAgentPublicDto.safeParse(body).success).toBe(false);
		expect(CreateAgentDto.safeParse(body).success).toBe(false);
	});

	it.each(['id', 'schema', 'skills', 'adoptOnCollision', 'unknown'])('rejects %s', (field) => {
		expect(CreateAgentPublicDto.safeParse({ name: 'Agent', [field]: {} }).success).toBe(false);
	});

	it('rejects an invalid custom tool name', () => {
		expect(
			CreateAgentPublicDto.safeParse({
				name: 'Agent',
				tools: { lookup: { code: 'return []', descriptor: { name: 'invalid name' } } },
			}).success,
		).toBe(false);
	});
});
