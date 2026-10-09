import type { AgentJsonSkillConfig } from '@n8n/api-types';
import type { OperationContext } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { AgentSkillRefsService } from '../agent-skill-refs.service';
import type { AgentHistory } from '../entities/agent-history.entity';
import type { Agent } from '../entities/agent.entity';
import { toAgentDocument } from '../json-config/agent-document';
import type { AgentRepository } from '../repositories/agent.repository';
import { storedAgentConfig } from './test-utils/stored-agent-config';

const refs: AgentJsonSkillConfig[] = [
	{ type: 'skill', id: 'zeta' },
	{ type: 'skill', id: 'alpha', enabled: false },
	{ type: 'skill', id: 'mid', enabled: true },
];

const baseConfig = { name: 'Agent', model: 'anthropic/claude-sonnet-4-5', instructions: 'Help.' };

function makeAgent(schema: Agent['schema']): Agent {
	return { id: 'agent-1', schema, updatedAt: new Date('2026-01-01T00:00:00.000Z') } as Agent;
}

describe('AgentSkillRefsService', () => {
	let agentRepository: ReturnType<typeof mock<AgentRepository>>;
	let service: AgentSkillRefsService;
	const ctx: OperationContext = {};

	beforeEach(() => {
		agentRepository = mock<AgentRepository>();
		service = new AgentSkillRefsService(agentRepository);
	});

	describe('refsForDraft', () => {
		it('returns the refs of the draft in stored order, with the enabled flags', async () => {
			const agent = makeAgent(storedAgentConfig({ ...baseConfig, skills: refs }));

			await expect(service.refsForDraft(agent, ctx)).resolves.toEqual(refs);
		});

		it('returns undefined when the draft has no skill list', async () => {
			await expect(
				service.refsForDraft(makeAgent(storedAgentConfig(baseConfig)), ctx),
			).resolves.toBeUndefined();
			await expect(service.refsForDraft(makeAgent(null), ctx)).resolves.toBeUndefined();
		});

		it('returns an empty list when the draft has an empty skill list', async () => {
			const agent = makeAgent(storedAgentConfig({ ...baseConfig, skills: [] }));

			await expect(service.refsForDraft(agent, ctx)).resolves.toEqual([]);
		});
	});

	describe('refsForVersion', () => {
		it('returns the refs of the published version', async () => {
			const version = {
				versionId: 'version-1',
				schema: storedAgentConfig({ ...baseConfig, skills: refs }),
			} as AgentHistory;

			await expect(service.refsForVersion(version, ctx)).resolves.toEqual(refs);
		});
	});

	describe('replaceDraftRefs', () => {
		it('writes the refs and keeps the rest of the config', async () => {
			const agent = makeAgent(storedAgentConfig({ ...baseConfig, tasks: [] }));
			const next: AgentJsonSkillConfig[] = [{ type: 'skill', id: 'new' }];

			await service.replaceDraftRefs(agent, next, ctx);

			expect(agentRepository.updateDraftSchema).toHaveBeenCalledWith(agent, ctx);
			await expect(service.refsForDraft(agent, ctx)).resolves.toEqual(next);
			expect(agent.schema && toAgentDocument(agent.schema, next)).toEqual({
				...baseConfig,
				tasks: [],
				skills: next,
			});
		});

		it('removes the skill list when the refs are undefined', async () => {
			const agent = makeAgent(storedAgentConfig({ ...baseConfig, skills: refs }));

			await service.replaceDraftRefs(agent, undefined, ctx);

			expect(agent.schema).not.toHaveProperty('skills');
			expect(agentRepository.updateDraftSchema).toHaveBeenCalledWith(agent, ctx);
		});

		it('does nothing for an agent without a config and without refs', async () => {
			const agent = makeAgent(null);

			await service.replaceDraftRefs(agent, undefined, ctx);

			expect(agentRepository.updateDraftSchema).not.toHaveBeenCalled();
		});

		it('rejects refs for an agent without a config', async () => {
			await expect(service.replaceDraftRefs(makeAgent(null), refs, ctx)).rejects.toThrow(
				'Cannot set skill refs on an agent without a config',
			);
			expect(agentRepository.updateDraftSchema).not.toHaveBeenCalled();
		});
	});
});
