import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { NotFoundError } from '@n8n/errors';

import type { AgentsService } from '../agents.service';
import { AgentsListController } from '../agents-list.controller';

describe('AgentsListController', () => {
	function makeController(agentsService = mock<AgentsService>()) {
		const controller = new AgentsListController(agentsService);
		return { controller, agentsService };
	}

	const user = { id: 'user-1' } as never;
	const req = { user } as never;

	it('serves the overview list when the chat filter is absent', async () => {
		const { controller, agentsService } = makeController();
		const response = { count: 2, data: [{ id: 'agent-1' }, { id: 'agent-2' }] } as never;
		const res = mock<Response>();
		const query = { skip: 0, take: 50, sortBy: 'updatedAt:desc' } as never;

		agentsService.findByUserMembershipPaginated.mockResolvedValue(response);

		await controller.list(req, res, query);

		expect(agentsService.findByUserMembershipPaginated).toHaveBeenCalledWith(user, query);
		expect(agentsService.findChatReachableByUserPaginated).not.toHaveBeenCalled();
		expect(res.json).toHaveBeenCalledWith(response);
	});

	it('passes a name filter to the overview list', async () => {
		const { controller, agentsService } = makeController();
		const res = mock<Response>();
		const query = { skip: 0, take: 10, filter: { query: 'support' } } as never;

		agentsService.findByUserMembershipPaginated.mockResolvedValue({ count: 0, data: [] } as never);

		await controller.list(req, res, query);

		expect(agentsService.findByUserMembershipPaginated).toHaveBeenCalledWith(user, query);
	});

	it.each([true, false])('serves the chat list when availableInChat is %s', async (value) => {
		const { controller, agentsService } = makeController();
		const response = { count: 1, data: [{ id: 'agent-1' }] } as never;
		const res = mock<Response>();
		const query = { skip: 0, take: 10, filter: { availableInChat: value } } as never;

		agentsService.findChatReachableByUserPaginated.mockResolvedValue(response);

		await controller.list(req, res, query);

		expect(agentsService.findChatReachableByUserPaginated).toHaveBeenCalledWith(user, query);
		expect(agentsService.findByUserMembershipPaginated).not.toHaveBeenCalled();
		expect(res.json).toHaveBeenCalledWith(response);
	});

	it('returns an empty page when the user has no accessible agents', async () => {
		const { controller, agentsService } = makeController();
		const res = mock<Response>();
		const query = { skip: 0, take: 50 } as never;
		const emptyResponse = { count: 0, data: [] } as never;

		agentsService.findByUserMembershipPaginated.mockResolvedValue(emptyResponse);

		await controller.list(req, res, query);

		expect(res.json).toHaveBeenCalledWith(emptyResponse);
	});

	describe('getChatAgent', () => {
		it("returns the narrow chat item for the registry to wrap in { data } — it must not call res.json itself, or the registry's wrapping never runs", async () => {
			const { controller, agentsService } = makeController();
			const item = { id: 'agent-1', name: 'Support', project: { id: 'p1', name: 'Team' } };
			agentsService.findChatReachableAgentForUser.mockResolvedValue(item as never);

			const result = await controller.getChatAgent(req, mock<Response>(), 'agent-1');

			expect(agentsService.findChatReachableAgentForUser).toHaveBeenCalledWith('agent-1', user);
			expect(result).toBe(item);
		});

		it('404s when the agent is not reachable over n8n Chat', async () => {
			const { controller, agentsService } = makeController();
			agentsService.findChatReachableAgentForUser.mockResolvedValue(null);

			await expect(controller.getChatAgent(req, mock<Response>(), 'agent-1')).rejects.toThrow(
				NotFoundError,
			);
		});
	});

	describe('listN8nChatThreads', () => {
		it('defaults the limit to 20 and forwards the cursor', async () => {
			const { controller, agentsService } = makeController();
			const res = mock<Response>();
			const response = { data: [], nextCursor: null } as never;

			agentsService.findN8nChatThreadsForUser.mockResolvedValue(response);

			await controller.listN8nChatThreads(req, res, { cursor: 'cursor-1' } as never);

			expect(agentsService.findN8nChatThreadsForUser).toHaveBeenCalledWith(user, {
				limit: 20,
				cursor: 'cursor-1',
			});
			expect(res.json).toHaveBeenCalledWith(response);
		});

		it('clamps the requested limit to the 1-100 range', async () => {
			const { controller, agentsService } = makeController();
			const res = mock<Response>();
			agentsService.findN8nChatThreadsForUser.mockResolvedValue({
				data: [],
				nextCursor: null,
			} as never);

			await controller.listN8nChatThreads(req, res, { limit: '500' } as never);
			expect(agentsService.findN8nChatThreadsForUser).toHaveBeenCalledWith(
				user,
				expect.objectContaining({ limit: 100 }),
			);

			await controller.listN8nChatThreads(req, res, { limit: '-5' } as never);
			expect(agentsService.findN8nChatThreadsForUser).toHaveBeenCalledWith(
				user,
				expect.objectContaining({ limit: 1 }),
			);
		});

		it('forwards an agentId filter', async () => {
			const { controller, agentsService } = makeController();
			const res = mock<Response>();
			agentsService.findN8nChatThreadsForUser.mockResolvedValue({
				data: [],
				nextCursor: null,
			} as never);

			await controller.listN8nChatThreads(req, res, { agentId: 'agent-1' } as never);

			expect(agentsService.findN8nChatThreadsForUser).toHaveBeenCalledWith(
				user,
				expect.objectContaining({ agentId: 'agent-1' }),
			);
		});
	});

	describe('getN8nChatThread', () => {
		it("returns the thread summary for the registry to wrap in { data } — it must not call res.json itself, or the registry's wrapping never runs", async () => {
			const { controller, agentsService } = makeController();
			const summary = {
				id: 'thread-1',
				title: 'Refund status',
				updatedAt: '2025-01-01T00:00:00.000Z',
				agent: { id: 'agent-1', name: 'Support', projectId: 'project-1' },
			};
			agentsService.findN8nChatThreadForUser.mockResolvedValue(summary as never);

			const result = await controller.getN8nChatThread(req, mock<Response>(), 'thread-1');

			expect(agentsService.findN8nChatThreadForUser).toHaveBeenCalledWith(user, 'thread-1');
			expect(result).toBe(summary);
		});

		it('404s when the thread is not found, not owned, or its agent is unreachable', async () => {
			const { controller, agentsService } = makeController();
			agentsService.findN8nChatThreadForUser.mockResolvedValue(null);

			await expect(controller.getN8nChatThread(req, mock<Response>(), 'thread-1')).rejects.toThrow(
				NotFoundError,
			);
		});
	});
});
