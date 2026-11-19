import type { AuthenticatedRequest } from '@n8n/db';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { AgentMemoryController } from '../agent-memory.controller';
import type { AgentMemoryEntriesService } from '../agent-memory-entries.service';
import {
	expectProjectScopedAgentRoutes,
	getRoutesByHandlerName,
} from './test-utils/controller-route-metadata';

describe('AgentMemoryController route access scopes', () => {
	expectProjectScopedAgentRoutes(AgentMemoryController);

	const routes = getRoutesByHandlerName(AgentMemoryController);

	it.each([
		['listMemoryEntries', 'agent:read'],
		['listMemorySourceFacets', 'agent:read'],
		['deleteMemoryEntry', 'agent:update'],
		['deleteMemoryCapture', 'agent:update'],
	])('%s uses %s', (handlerName, scope) => {
		expect(routes.get(handlerName)?.accessScope?.scope).toBe(scope);
	});
});

describe('AgentMemoryController', () => {
	const service = mock<AgentMemoryEntriesService>();
	const controller = new AgentMemoryController(service);
	const req = { user: { id: 'viewer-1' } } as AuthenticatedRequest<{ projectId: string }>;

	it('lists entries for the requesting user', async () => {
		const page = { items: [], total: 0, nextCursor: null };
		service.list.mockResolvedValue(page);

		await expect(
			controller.listMemoryEntries(req, mock<Response>(), 'project-1', 'agent-1', { limit: '10' }),
		).resolves.toBe(page);
		expect(service.list).toHaveBeenCalledWith('agent-1', 'project-1', 'viewer-1', { limit: '10' });
	});

	it('lists the source facets for the requesting user', async () => {
		const facets = { groups: [] };
		service.listSourceFacets.mockResolvedValue(facets);

		await expect(
			controller.listMemorySourceFacets(req, mock<Response>(), 'project-1', 'agent-1'),
		).resolves.toBe(facets);
		expect(service.listSourceFacets).toHaveBeenCalledWith('agent-1', 'project-1', 'viewer-1');
	});

	it('deletes one entry', async () => {
		await expect(
			controller.deleteMemoryEntry(req, mock<Response>(), 'project-1', 'agent-1', 'entry-1'),
		).resolves.toEqual({ success: true });
		expect(service.delete).toHaveBeenCalledWith('agent-1', 'project-1', 'entry-1');
	});

	it('deletes one flagged capture', async () => {
		await expect(
			controller.deleteMemoryCapture(req, mock<Response>(), 'project-1', 'agent-1', 'capture-1'),
		).resolves.toEqual({ success: true });
		expect(service.deleteCapture).toHaveBeenCalledWith('agent-1', 'project-1', 'capture-1');
	});
});
