import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

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
});
