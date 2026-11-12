import { CreateAgentDto, CreateAgentPublicDto } from '../dto';

const validConfig = { name: 'Agent', model: '', instructions: 'Help users' };

describe('CreateAgentDto', () => {
	it.each([
		{},
		{ config: validConfig },
		{ schema: { name: 'Source', model: '', instructions: '' } },
	])('accepts a draft, initial config, or duplication schema: %j', (configuration) => {
		const request = { name: 'Agent', ...configuration };
		expect(CreateAgentDto.parse(request)).toMatchObject(request);
		expect(CreateAgentDto.schema.parse(request)).toMatchObject(request);
		expect(new CreateAgentDto(request)).toMatchObject(request);
	});

	it('rejects an initial config that is not a valid agent config', () => {
		// Invalid on purpose, so it cannot use the DTO input type.
		const request: unknown = {
			name: 'Agent',
			// Missing the required config fields `name`, `model`, and `instructions`.
			config: { instructions: 'Help users' },
		};
		expect(CreateAgentDto.safeParse(request).success).toBe(false);
		expect(CreateAgentDto.schema.safeParse(request).success).toBe(false);
		expect(() => new CreateAgentDto(request as never)).toThrow();
	});

	it('rejects initial config combined with a duplication schema', () => {
		const request = {
			name: 'Agent',
			config: validConfig,
			schema: { name: 'Source', model: '', instructions: '' },
		};
		expect(CreateAgentDto.safeParse(request).success).toBe(false);
		expect(CreateAgentDto.schema.safeParse(request).success).toBe(false);
		expect(() => new CreateAgentDto(request)).toThrow(
			'Use config for initial configuration or schema for duplication, not both.',
		);
	});
});

describe('CreateAgentPublicDto', () => {
	it('accepts a name alone, defaulting everything else', () => {
		expect(CreateAgentPublicDto.parse({ name: 'Agent' })).toEqual({ name: 'Agent' });
	});

	it('accepts a target project, config, tools, and MCP availability', () => {
		const request = {
			name: 'Agent',
			projectId: 'project-1',
			config: validConfig,
			tools: { myTool: { code: 'return []', descriptor: { name: 'myTool' } } },
			availableInMCP: true,
		};
		expect(CreateAgentPublicDto.parse(request)).toEqual(request);
	});

	it('rejects a config that is not a valid agent config', () => {
		const request = { name: 'Agent', config: { instructions: 'Help users' } };
		expect(CreateAgentPublicDto.safeParse(request).success).toBe(false);
	});

	it('rejects internal-only fields', () => {
		const internal = {
			id: '0123456789abcdef',
			schema: validConfig,
			skills: {},
			tags: ['tag-1'],
		};
		for (const [field, value] of Object.entries(internal)) {
			expect(CreateAgentPublicDto.safeParse({ name: 'Agent', [field]: value }).success).toBe(false);
		}
	});

	it('rejects unknown fields', () => {
		expect(CreateAgentPublicDto.safeParse({ name: 'Agent', unexpected: true }).success).toBe(false);
	});
});
