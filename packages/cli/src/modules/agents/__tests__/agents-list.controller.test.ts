import { mock } from 'jest-mock-extended';
import type { Response } from 'express';

import type { AgentsService } from '../agents.service';
import { AgentsListController } from '../agents-list.controller';

describe('AgentsListController', () => {
	function makeController(agentsService = mock<AgentsService>()) {
		const controller = new AgentsListController(agentsService);
		return { controller, agentsService };
	}

	it('writes the paginated user agents response via res.json', async () => {
		const { controller, agentsService } = makeController();
		const response = { count: 2, data: [{ id: 'agent-1' }, { id: 'agent-2' }] } as never;
		const res = mock<Response>();
		const query = { skip: 0, take: 50, sortBy: 'updatedAt:desc' } as never;
		const req = { user: { id: 'user-1' } } as never;

		agentsService.findByUserPaginated.mockResolvedValue(response);

		await controller.list(req, res, query);

		expect(agentsService.findByUserPaginated).toHaveBeenCalledWith('user-1', query);
		expect(res.json).toHaveBeenCalledWith(response);
	});

	it('passes name filter to the service', async () => {
		const { controller, agentsService } = makeController();
		const res = mock<Response>();
		const query = { skip: 0, take: 10, filter: { query: 'support' } } as never;
		const req = { user: { id: 'user-1' } } as never;

		agentsService.findByUserPaginated.mockResolvedValue({ count: 0, data: [] } as never);

		await controller.list(req, res, query);

		expect(agentsService.findByUserPaginated).toHaveBeenCalledWith('user-1', query);
	});

	it('returns an empty page when the user has no accessible agents', async () => {
		const { controller, agentsService } = makeController();
		const res = mock<Response>();
		const query = { skip: 0, take: 50 } as never;
		const req = { user: { id: 'user-1' } } as never;
		const emptyResponse = { count: 0, data: [] } as never;

		agentsService.findByUserPaginated.mockResolvedValue(emptyResponse);

		await controller.list(req, res, query);

		expect(res.json).toHaveBeenCalledWith(emptyResponse);
	});
});
