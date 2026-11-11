import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';

import type { AgentPublishService } from '../agent-publish.service';
import { AgentResponseMapper, mapAgentListItem } from '../agent-response.mapper';
import { AgentRunnableStateService } from '../agent-runnable-state.service';
import type { AgentValidationService } from '../agent-validation.service';
import type { Agent } from '../entities/agent.entity';
import { composeJsonConfig } from '../json-config/agent-config-composition';
import { createAgentSkillRefsService, storedSkillRefs } from './test-utils/stored-agent-config';

const createdAt = new Date('2026-01-01T00:00:00.000Z');
const updatedAt = new Date('2026-01-02T00:00:00.000Z');
const publishedIntegrations = [{ type: 'n8n_chat' as const, credentialId: '' }];

function agentFixture(schema: Agent['schema']): Agent {
	return {
		id: 'agent-1',
		name: 'Support',
		projectId: 'project-1',
		project: { id: 'project-1', name: 'Team', type: 'team' },
		availableInMCP: true,
		versionId: 'v2',
		activeVersionId: 'v1',
		createdAt,
		updatedAt,
		schema,
		integrations: [{ type: 'slack', credentialId: 'cred-1' }],
		tools: { lookup: { code: 'return 1;', descriptor: { name: 'lookup' } } },
		scope: 'draft',
		revision: 4,
		publicationRevision: 2,
		setupCompletedAt: createdAt,
		skills: { stale: { name: 'Stale' } },
		activeVersion: schema
			? {
					versionId: 'v1',
					schema: { name: 'Support', integrations: publishedIntegrations },
				}
			: null,
	} as unknown as Agent;
}

describe('AgentResponseMapper', () => {
	function makeMapper() {
		const skillRefs = createAgentSkillRefsService();
		const validation = mock<AgentValidationService>();
		validation.validateLoadedAgentConfiguration.mockResolvedValue({ status: 'valid', issues: [] });
		const publish = mock<AgentPublishService>();
		publish.hasPublishHistory.mockResolvedValue(true);
		publish.hasVersionHistory.mockResolvedValue(false);
		const runnable = new AgentRunnableStateService(
			mock<CredentialsService>(),
			validation,
			publish,
			skillRefs,
		);
		return { mapper: new AgentResponseMapper(runnable), skillRefs };
	}

	it('returns the composed config and leaves storage columns off the response', async () => {
		const schema = {
			name: 'Support',
			instructions: 'Help users',
			skills: [{ type: 'skill' as const, id: 'triage' }],
			personalisation: { icon: 'bot' },
		};
		const agent = agentFixture(schema as never);
		const { mapper } = makeMapper();

		const dto = await mapper.toAgentDto(agent, 'project-1', mock<User>());

		expect(dto.config).toEqual(composeJsonConfig(agent, storedSkillRefs(agent)));
		expect(dto.configHash).toMatch(/^[a-f0-9]{64}$/);
		expect(dto.createdAt).toBe(createdAt.toISOString());
		expect(dto.updatedAt).toBe(updatedAt.toISOString());
		expect(dto.activeVersion).toEqual({
			versionId: 'v1',
			integrations: publishedIntegrations,
		});
		expect(dto.project).toEqual({ id: 'project-1', name: 'Team', type: 'team' });
		expect(dto.tools).toEqual(agent.tools);
		expect(dto.isRunnable).toBe(true);
		expect(dto.hasPublishHistory).toBe(true);
		expect(dto.hasVersionHistory).toBe(false);
		for (const key of [
			'schema',
			'integrations',
			'scope',
			'revision',
			'publicationRevision',
			'setupCompletedAt',
		]) {
			expect(dto).not.toHaveProperty(key);
		}
		expect(agent).not.toHaveProperty('isRunnable');
		expect(agent).not.toHaveProperty('config');
	});

	it('returns a null config when the draft has no schema', async () => {
		const agent = agentFixture(null);
		const { mapper } = makeMapper();

		const dto = await mapper.toAgentDto(agent, 'project-1', mock<User>());

		expect(dto.config).toBeNull();
		expect(dto.configHash).toBeNull();
		expect(dto.activeVersion).toBeNull();
	});

	it('copies personalisation onto a list item and omits config', () => {
		const schema = {
			name: 'Support',
			personalisation: { icon: 'bot' },
		};
		const item = mapAgentListItem(agentFixture(schema as never));

		expect(item).toMatchObject({
			id: 'agent-1',
			name: 'Support',
			hasConfig: true,
			personalisation: { icon: 'bot' },
			createdAt: createdAt.toISOString(),
			updatedAt: updatedAt.toISOString(),
		});
		expect(item).not.toHaveProperty('config');
		expect(item).not.toHaveProperty('schema');
		expect(mapAgentListItem(agentFixture(null)).hasConfig).toBe(false);
	});
});
