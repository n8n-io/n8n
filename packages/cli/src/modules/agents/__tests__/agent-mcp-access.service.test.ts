import { mockInstance } from '@n8n/backend-test-utils';
import { ProjectRelationRepository, User } from '@n8n/db';
import type { Mock } from 'vitest';

vi.mock('@/permissions.ee/check-access', () => ({
	userHasScopes: vi.fn(),
}));

import { userHasScopes } from '@/permissions.ee/check-access';

import { AgentMcpAccessService } from '../agent-mcp-access.service';
import { AgentRepository } from '../repositories/agent.repository';

const userHasScopesMock = userHasScopes as Mock;

const user = Object.assign(new User(), { id: 'user-1' });

const candidate = (id: string, projectId: string, availableInMCP: boolean) => ({
	id,
	projectId,
	availableInMCP,
});

const projectRelations = (...projectIds: string[]) =>
	projectIds.map((projectId) => ({ projectId })) as never;

describe('AgentMcpAccessService', () => {
	const agentRepository = mockInstance(AgentRepository);
	const projectRelationRepository = mockInstance(ProjectRelationRepository);
	const service = new AgentMcpAccessService(agentRepository, projectRelationRepository);

	beforeEach(() => {
		vi.clearAllMocks();
		userHasScopesMock.mockResolvedValue(true);
	});

	describe('getEligibleAgents', () => {
		it('lists non-exposed agents from projects where the user holds agent:update', async () => {
			projectRelationRepository.findAllByUser.mockResolvedValue(
				projectRelations('project-1', 'project-2'),
			);
			userHasScopesMock.mockImplementation(
				async (_user: User, _scopes: string[], _global: boolean, ctx: { projectId: string }) =>
					ctx.projectId === 'project-1',
			);
			agentRepository.findByProjectIdsPaginated.mockResolvedValue({ count: 0, data: [] });

			await service.getEligibleAgents(user, { skip: 0, take: 10 } as never);

			expect(agentRepository.findByProjectIdsPaginated).toHaveBeenCalledWith(
				['project-1'],
				expect.objectContaining({ filter: { availableInMCP: false } }),
			);
		});
	});

	describe('bulkSetAvailableInMCP', () => {
		it('rejects when no target is provided', async () => {
			await expect(
				service.bulkSetAvailableInMCP(user, { availableInMCP: true } as never),
			).rejects.toThrow('exactly one');
		});

		it('rejects when multiple targets are provided', async () => {
			await expect(
				service.bulkSetAvailableInMCP(user, {
					availableInMCP: true,
					agentIds: ['a1'],
					allAgents: true,
				} as never),
			).rejects.toThrow('exactly one');
		});

		it('updates only accessible agents not already in the requested state', async () => {
			agentRepository.findMcpAvailabilityCandidates.mockResolvedValue([
				candidate('a1', 'project-1', false),
				candidate('a2', 'project-1', true),
				candidate('a3', 'project-2', false),
			]);
			userHasScopesMock.mockImplementation(
				async (_user: User, _scopes: string[], _global: boolean, ctx: { projectId: string }) =>
					ctx.projectId === 'project-1',
			);

			const result = await service.bulkSetAvailableInMCP(user, {
				availableInMCP: true,
				agentIds: ['a1', 'a2', 'a3'],
			} as never);

			expect(userHasScopesMock).toHaveBeenCalledWith(user, ['agent:update'], false, {
				projectId: 'project-1',
			});
			expect(agentRepository.setAvailableInMCP).toHaveBeenCalledWith(['a1'], true);
			expect(result).toEqual({
				updatedCount: 1,
				unchangedCount: 1,
				skippedCount: 1,
				failedCount: 0,
				updatedIds: ['a1'],
				unchangedIds: ['a2'],
			});
		});

		it('resolves candidates from every user project for allAgents and omits id lists', async () => {
			projectRelationRepository.findAllByUser.mockResolvedValue(projectRelations('p1', 'p2'));
			agentRepository.findMcpAvailabilityCandidates.mockResolvedValue([
				candidate('a1', 'p1', true),
			]);

			const result = await service.bulkSetAvailableInMCP(user, {
				availableInMCP: false,
				allAgents: true,
			} as never);

			expect(agentRepository.findMcpAvailabilityCandidates).toHaveBeenCalledWith({
				projectIds: ['p1', 'p2'],
			});
			expect(agentRepository.setAvailableInMCP).toHaveBeenCalledWith(['a1'], false);
			expect(result.updatedCount).toBe(1);
			expect(result.updatedIds).toBeUndefined();
			expect(result.unchangedIds).toBeUndefined();
		});

		it('resolves candidates from the given project only', async () => {
			agentRepository.findMcpAvailabilityCandidates.mockResolvedValue([
				candidate('a1', 'p1', false),
			]);

			await service.bulkSetAvailableInMCP(user, {
				availableInMCP: true,
				projectId: 'p1',
			} as never);

			expect(agentRepository.findMcpAvailabilityCandidates).toHaveBeenCalledWith({
				projectIds: ['p1'],
			});
			expect(projectRelationRepository.findAllByUser).not.toHaveBeenCalled();
		});
	});
});
