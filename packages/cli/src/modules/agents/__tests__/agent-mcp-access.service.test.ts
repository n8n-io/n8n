import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';

import { ProjectScopeService } from '@/permissions.ee/project-scope.service';

import { AgentMcpAccessService } from '../agent-mcp-access.service';
import { AgentRepository } from '../repositories/agent.repository';

const user = Object.assign(new User(), { id: 'user-1' });

const candidate = (id: string, projectId: string, availableInMCP: boolean) => ({
	id,
	projectId,
	availableInMCP,
});

describe('AgentMcpAccessService', () => {
	const agentRepository = mockInstance(AgentRepository);
	const projectScopeService = mockInstance(ProjectScopeService);
	const service = new AgentMcpAccessService(agentRepository, projectScopeService);

	beforeEach(() => {
		vi.clearAllMocks();
		projectScopeService.getProjectIds.mockResolvedValue(['project-1']);
	});

	describe('getAgents', () => {
		it('lists non-exposed agents from projects where the user holds agent:update', async () => {
			agentRepository.findByProjectIdsPaginated.mockResolvedValue({ count: 0, data: [] });

			await service.getAgents(user, { skip: 0, take: 10 } as never);

			expect(projectScopeService.getProjectIds).toHaveBeenCalledWith(user, ['agent:update']);
			expect(agentRepository.findByProjectIdsPaginated).toHaveBeenCalledWith(
				['project-1'],
				expect.objectContaining({ filter: { availableInMCP: false } }),
				{ withProject: true },
			);
		});

		it('lists agents without a project restriction for global agent:update', async () => {
			projectScopeService.getProjectIds.mockResolvedValue(null);
			agentRepository.findByProjectIdsPaginated.mockResolvedValue({ count: 0, data: [] });

			await service.getAgents(user, { skip: 0, take: 10 } as never);

			expect(agentRepository.findByProjectIdsPaginated).toHaveBeenCalledWith(
				null,
				expect.objectContaining({ filter: { availableInMCP: false } }),
				{ withProject: true },
			);
		});

		it('lists exposed agents only from projects where the user holds agent:update', async () => {
			projectScopeService.getProjectIds.mockResolvedValue(['project-1']);
			agentRepository.findByProjectIdsPaginated.mockResolvedValue({ count: 0, data: [] });

			await service.getAgents(user, {
				skip: 0,
				take: 10,
				filter: { availableInMCP: true },
			} as never);

			expect(agentRepository.findByProjectIdsPaginated).toHaveBeenCalledWith(
				['project-1'],
				expect.objectContaining({ filter: { availableInMCP: true } }),
				{ withProject: true },
			);
		});

		it('lists exposed agents without a project restriction for global agent:update', async () => {
			projectScopeService.getProjectIds.mockResolvedValue(null);
			agentRepository.findByProjectIdsPaginated.mockResolvedValue({ count: 0, data: [] });

			await service.getAgents(user, {
				skip: 0,
				take: 10,
				filter: { availableInMCP: true },
			} as never);

			expect(agentRepository.findByProjectIdsPaginated).toHaveBeenCalledWith(
				null,
				expect.objectContaining({ filter: { availableInMCP: true } }),
				{ withProject: true },
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

			const result = await service.bulkSetAvailableInMCP(user, {
				availableInMCP: true,
				agentIds: ['a1', 'a2', 'a3'],
			} as never);

			expect(agentRepository.setAvailableInMCP).toHaveBeenCalledWith(['a1'], true);
			expect(result).toEqual({
				updatedCount: 1,
				updatedIds: ['a1'],
				unchangedIds: ['a2'],
			});
		});

		it('resolves candidates from every user project for allAgents and omits id lists', async () => {
			projectScopeService.getProjectIds.mockResolvedValue(['p1', 'p2']);
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

		it('resolves all candidates for allAgents with global agent:update', async () => {
			projectScopeService.getProjectIds.mockResolvedValue(null);
			agentRepository.findMcpAvailabilityCandidates.mockResolvedValue([
				candidate('a1', 'p1', false),
				candidate('a2', 'p2', false),
			]);

			const result = await service.bulkSetAvailableInMCP(user, {
				availableInMCP: true,
				allAgents: true,
			} as never);

			expect(agentRepository.findMcpAvailabilityCandidates).toHaveBeenCalledWith({ all: true });
			expect(agentRepository.setAvailableInMCP).toHaveBeenCalledWith(['a1', 'a2'], true);
			expect(result.updatedCount).toBe(2);
		});

		it('chunks large updates to stay within database parameter limits', async () => {
			projectScopeService.getProjectIds.mockResolvedValue(null);
			const candidates = Array.from({ length: 600 }, (_, index) =>
				candidate(`a${index}`, `p${index}`, false),
			);
			agentRepository.findMcpAvailabilityCandidates.mockResolvedValue(candidates);

			const result = await service.bulkSetAvailableInMCP(user, {
				availableInMCP: true,
				allAgents: true,
			} as never);

			expect(agentRepository.setAvailableInMCP).toHaveBeenCalledTimes(2);
			expect(agentRepository.setAvailableInMCP).toHaveBeenNthCalledWith(
				1,
				candidates.slice(0, 500).map(({ id }) => id),
				true,
			);
			expect(agentRepository.setAvailableInMCP).toHaveBeenNthCalledWith(
				2,
				candidates.slice(500).map(({ id }) => id),
				true,
			);
			expect(result.updatedCount).toBe(600);
		});

		it('does not load agents from a project the user cannot update', async () => {
			projectScopeService.getProjectIds.mockResolvedValue([]);

			const result = await service.bulkSetAvailableInMCP(user, {
				availableInMCP: true,
				projectId: 'p1',
			} as never);

			expect(agentRepository.findMcpAvailabilityCandidates).not.toHaveBeenCalled();
			expect(agentRepository.setAvailableInMCP).not.toHaveBeenCalled();
			expect(result).toEqual({ updatedCount: 0 });
		});

		it('resolves candidates from the given project only', async () => {
			projectScopeService.getProjectIds.mockResolvedValue(['p1']);
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
		});
	});
});
