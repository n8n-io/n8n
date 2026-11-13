import { AgentDto, AgentListItemDto, UpdateAgentDto } from '../dto';

const config = { name: 'Support', instructions: 'Help users' };

const agentDto = {
	id: 'agent-1',
	name: 'Support',
	projectId: 'project-1',
	project: { id: 'project-1', name: 'Team', type: 'team' },
	availableInMCP: false,
	isArchived: false,
	versionId: 'v1',
	activeVersionId: 'v1',
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-02T00:00:00.000Z',
	config,
	configHash: 'abc',
	tools: {},
	activeVersion: { versionId: 'v1', integrations: [] },
	isRunnable: true,
	hasPublishHistory: false,
	hasVersionHistory: true,
	skills: {},
	skillHashes: {},
	outdatedSkillIds: [],
	skillVersions: {},
};

describe('UpdateAgentDto', () => {
	it('exposes safeParse for the controller registry', () => {
		expect('safeParse' in UpdateAgentDto).toBe(true);
	});

	it('accepts a full agent response and keeps configHash as the concurrency token', () => {
		expect(UpdateAgentDto.parse(agentDto)).toEqual({
			config,
			baseConfigHash: 'abc',
		});
	});

	it('accepts the editor body', () => {
		expect(UpdateAgentDto.parse({ config, baseConfigHash: null })).toEqual({
			config,
			baseConfigHash: null,
		});
	});

	it('prefers an explicit baseConfigHash over configHash', () => {
		expect(UpdateAgentDto.parse({ config, baseConfigHash: null, configHash: 'abc' })).toEqual({
			config,
			baseConfigHash: null,
		});
	});

	it('rejects a body that has neither hash', () => {
		const result = UpdateAgentDto.safeParse({ config });
		expect(result.success).toBe(false);
	});

	it('does not require the server-managed fields', () => {
		expect(UpdateAgentDto.parse({ config, baseConfigHash: 'abc' })).toEqual({
			config,
			baseConfigHash: 'abc',
		});
	});

	it('strips the adopted flag a create or draft-state response carries', () => {
		expect(UpdateAgentDto.parse({ ...agentDto, adopted: true })).toEqual({
			config,
			baseConfigHash: 'abc',
		});
	});

	it('rejects a field that is not on the agent response', () => {
		const result = UpdateAgentDto.safeParse({ config, baseConfigHash: 'abc', schema: {} });
		expect(result.success).toBe(false);
	});
});

describe('AgentDto', () => {
	it('accepts a response whose config is an older loose document', () => {
		expect(AgentDto.safeParse(agentDto).success).toBe(true);
		expect(AgentDto.safeParse({ ...agentDto, config: null, configHash: null }).success).toBe(true);
	});
});

describe('AgentListItemDto', () => {
	it('accepts a list row without config', () => {
		expect(
			AgentListItemDto.safeParse({
				id: 'agent-1',
				name: 'Support',
				projectId: 'project-1',
				project: null,
				availableInMCP: false,
				isArchived: false,
				versionId: null,
				activeVersionId: null,
				createdAt: '2026-01-01T00:00:00.000Z',
				updatedAt: '2026-01-02T00:00:00.000Z',
				personalisation: null,
				hasConfig: false,
			}).success,
		).toBe(true);
	});
});
