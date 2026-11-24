import { UpdateAgentPublicDto } from '../dto';

const validConfig = { name: 'Agent', model: 'openai/gpt-5', instructions: 'Help users' };

/** The body `GET /agents/:agentId` returns, with the concurrency token added. */
const roundTrippedGetBody = {
	id: 'agent-1',
	name: 'Agent',
	projectId: 'project-1',
	project: null,
	parentFolder: null,
	availableInMCP: false,
	isArchived: false,
	versionId: 'version-1',
	activeVersionId: null,
	createdAt: '2025-01-02T03:04:05.000Z',
	updatedAt: '2025-06-07T08:09:10.000Z',
	config: validConfig,
	configHash: 'hash-1',
	tools: {},
	activeVersion: null,
};

describe('UpdateAgentPublicDto', () => {
	it('accepts a round-tripped GET body and keeps only config and the token', () => {
		expect(UpdateAgentPublicDto.parse(roundTrippedGetBody)).toEqual({
			config: validConfig,
			baseConfigHash: 'hash-1',
		});
	});

	it('uses configHash as the token when baseConfigHash is absent', () => {
		expect(UpdateAgentPublicDto.parse({ config: validConfig, configHash: 'hash-2' })).toEqual({
			config: validConfig,
			baseConfigHash: 'hash-2',
		});
	});

	it('prefers baseConfigHash over configHash', () => {
		expect(
			UpdateAgentPublicDto.parse({
				config: validConfig,
				baseConfigHash: 'hash-1',
				configHash: 'hash-2',
			}),
		).toEqual({ config: validConfig, baseConfigHash: 'hash-1' });
	});

	it('accepts a null token: the agent had no config yet', () => {
		expect(UpdateAgentPublicDto.parse({ config: validConfig, baseConfigHash: null })).toEqual({
			config: validConfig,
			baseConfigHash: null,
		});
	});

	it('accepts a null config: the retrieved body of an agent without one', () => {
		expect(UpdateAgentPublicDto.parse({ config: null, baseConfigHash: null })).toEqual({
			config: null,
			baseConfigHash: null,
		});
	});

	it('requires the concurrency token', () => {
		expect(UpdateAgentPublicDto.safeParse({ config: validConfig }).success).toBe(false);
		expect(() => UpdateAgentPublicDto.parse({ config: validConfig } as never)).toThrow();
	});

	it('rejects a config that is not a valid agent config', () => {
		// Missing the required config fields `name`, `model`, and `instructions`.
		const request: unknown = { config: { instructions: 'Help users' }, baseConfigHash: 'hash-1' };
		expect(UpdateAgentPublicDto.safeParse(request).success).toBe(false);
	});

	it('rejects a field it does not know', () => {
		const request = { config: validConfig, baseConfigHash: 'hash-1', unexpected: true };
		expect(UpdateAgentPublicDto.safeParse(request).success).toBe(false);
	});

	it('ignores builder-only fields a body may carry', () => {
		const request = {
			config: validConfig,
			baseConfigHash: 'hash-1',
			isRunnable: true,
			skills: {},
			skillVersions: {},
		};
		expect(UpdateAgentPublicDto.parse(request)).toEqual({
			config: validConfig,
			baseConfigHash: 'hash-1',
		});
	});
});
