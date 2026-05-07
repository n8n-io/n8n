/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests intentionally reference unbound methods */
import type { AgentIntegration } from '@n8n/api-types';
import { mock } from 'jest-mock-extended';

import { mockEntityManager } from '@test/mocking';

import { Agent } from '../entities/agent.entity';
import { AgentRepository } from '../repositories/agent.repository';

const entityManager = mockEntityManager(Agent);
const mockDataSource = { manager: entityManager };

describe('AgentRepository', () => {
	let repository: AgentRepository;

	beforeEach(() => {
		jest.clearAllMocks();
		repository = new AgentRepository(mockDataSource as never);
	});

	describe('findByIdAndProjectId', () => {
		it('calls findOne with id, projectId, and the publishedVersion relation', async () => {
			const agent = mock<Agent>({ id: 'agent-1', projectId: 'project-1' });
			jest.spyOn(repository, 'findOne').mockResolvedValue(agent);

			const result = await repository.findByIdAndProjectId('agent-1', 'project-1');

			expect(repository.findOne).toHaveBeenCalledWith({
				where: { id: 'agent-1', projectId: 'project-1' },
				relations: { publishedVersion: true },
			});
			expect(result).toBe(agent);
		});

		it('returns null when no agent matches', async () => {
			jest.spyOn(repository, 'findOne').mockResolvedValue(null);

			const result = await repository.findByIdAndProjectId('agent-1', 'project-1');

			expect(result).toBeNull();
		});
	});

	describe('findByProjectId', () => {
		it('calls find ordered by updatedAt descending with the publishedVersion relation', async () => {
			const agents = [mock<Agent>(), mock<Agent>()];
			jest.spyOn(repository, 'find').mockResolvedValue(agents);

			const result = await repository.findByProjectId('project-1');

			expect(repository.find).toHaveBeenCalledWith({
				where: { projectId: 'project-1' },
				relations: { publishedVersion: true },
				order: { updatedAt: 'DESC' },
			});
			expect(result).toBe(agents);
		});

		it('returns an empty array when the project has no agents', async () => {
			jest.spyOn(repository, 'find').mockResolvedValue([]);

			const result = await repository.findByProjectId('project-1');

			expect(result).toEqual([]);
		});
	});

	describe('findByIntegrationCredential', () => {
		const makeAgent = (id: string, integrations: AgentIntegration[]) =>
			({ id, integrations }) as Agent;

		it('returns agents that have a matching type + credentialId, excluding the given agentId', async () => {
			const agents = [
				makeAgent('agent-self', [
					{ type: 'telegram', credentialId: 'cred-1', credentialName: 'Telegram cred 1' },
				]),
				makeAgent('agent-other', [
					{ type: 'telegram', credentialId: 'cred-1', credentialName: 'Telegram cred 1' },
				]),
				makeAgent('agent-slack', [
					{ type: 'slack', credentialId: 'cred-1', credentialName: 'Slack cred 1' },
				]),
				makeAgent('agent-unrelated', [
					{ type: 'telegram', credentialId: 'cred-2', credentialName: 'Telegram cred 2' },
				]),
				makeAgent('agent-empty', []),
			];
			jest.spyOn(repository, 'find').mockResolvedValue(agents);

			const result = await repository.findByIntegrationCredential(
				'telegram',
				'cred-1',
				'project-1',
				'agent-self',
			);

			expect(result.map((a) => a.id)).toEqual(['agent-other']);
		});

		it('returns an empty array when no other agent uses the credential', async () => {
			jest
				.spyOn(repository, 'find')
				.mockResolvedValue([
					makeAgent('agent-self', [
						{ type: 'telegram', credentialId: 'cred-1', credentialName: 'Telegram cred 1' },
					]),
				]);

			const result = await repository.findByIntegrationCredential(
				'telegram',
				'cred-1',
				'project-1',
				'agent-self',
			);

			expect(result).toEqual([]);
		});

		it('handles agents whose integrations column is null / undefined without crashing', async () => {
			const agents = [
				makeAgent('agent-a', [
					{ type: 'telegram', credentialId: 'cred-1', credentialName: 'Telegram cred 1' },
				]),
				{ id: 'agent-null', integrations: null } as unknown as Agent,
				{ id: 'agent-undef' } as unknown as Agent,
			];
			jest.spyOn(repository, 'find').mockResolvedValue(agents);

			const result = await repository.findByIntegrationCredential(
				'telegram',
				'cred-1',
				'project-1',
				'agent-self',
			);

			expect(result.map((a) => a.id)).toEqual(['agent-a']);
		});

		it('ignores schedule integrations when matching on credentialId', async () => {
			const agents = [
				makeAgent('agent-schedule', [
					{
						type: 'schedule',
						active: true,
						cronExpression: '* * * * *',
						wakeUpPrompt: 'Automated message',
					},
				]),
				makeAgent('agent-match', [
					{ type: 'telegram', credentialId: 'cred-1', credentialName: 'Telegram cred 1' },
				]),
			];
			jest.spyOn(repository, 'find').mockResolvedValue(agents);

			const result = await repository.findByIntegrationCredential(
				'telegram',
				'cred-1',
				'project-1',
				'agent-self',
			);

			expect(result.map((a) => a.id)).toEqual(['agent-match']);
		});
	});
});
