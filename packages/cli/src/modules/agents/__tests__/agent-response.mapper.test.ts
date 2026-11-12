import { AgentPublicDto } from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';

import { mapAgentDto } from '../agent-response.mapper';
import type { Agent } from '../entities/agent.entity';

it('maps the composed config and exposes an allowlisted public response', () => {
	const agent = mock<Agent>({
		id: 'agent-1',
		name: 'Support',
		projectId: 'project-1',
		project: null,
		createdAt: new Date('2026-01-01T00:00:00Z'),
		updatedAt: new Date('2026-01-02T00:00:00Z'),
		schema: { name: 'Support', model: '', instructions: 'Help users.' },
		tools: {},
		activeVersion: null,
		availableInMCP: false,
		isArchived: false,
		versionId: null,
		activeVersionId: null,
	});
	const config = { name: 'Support', model: '', instructions: 'Help users.', skills: [] };
	const state = {
		isRunnable: false,
		hasPublishHistory: false,
		hasVersionHistory: true,
		configHash: 'hash',
		skills: {},
		skillHashes: {},
		outdatedSkillIds: [],
		skillVersions: {},
		config,
	};
	const dto = mapAgentDto(agent, state);
	expect(dto).toMatchObject({ id: 'agent-1', config, configHash: 'hash', isRunnable: false });
	expect(dto).not.toHaveProperty('schema');
	expect(dto).not.toHaveProperty('integrations');
	const publicDto = AgentPublicDto.parse(dto);
	expect(publicDto).toMatchObject({
		config,
		configHash: 'hash',
		createdAt: '2026-01-01T00:00:00.000Z',
	});
	expect(publicDto).not.toHaveProperty('skillHashes');
	expect(publicDto).not.toHaveProperty('isRunnable');
});
