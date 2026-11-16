import type { AuthenticatedRequest } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { NotFoundError } from '@n8n/errors';
import type { AgentsService, DeletedAgentSnapshot } from '@/modules/agents/agents.service';

import { AgentsPublicController } from '../agents.public.controller';

describe('AgentsPublicController route metadata', () => {
	const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
		AgentsPublicController as never,
	);
	const routeCases = Array.from(metadata.routes.entries()).map(([handlerName, route]) => ({
		handlerName,
		route,
	}));

	it('registers the delete route', () => {
		expect(routeCases.map(({ handlerName }) => handlerName)).toEqual(['deleteAgent']);
	});

	it.each(routeCases)('$handlerName requires the agent:delete API key scope', ({ route }) => {
		expect(route.apiKeyScope).toBe('agent:delete');
	});

	it.each(routeCases)(
		'$handlerName is gated by a project-level agent:delete RBAC check',
		({ route }) => {
			expect(route.accessScope).toEqual({ scope: 'agent:delete', globalOnly: false });
		},
	);

	it.each(routeCases)('$handlerName answers 200 with the deleted agent DTO', ({ route }) => {
		expect(route.successStatus).toBe(200);
		expect(route.responseDto).toBeDefined();
		expect(route.errorResponses?.some((response) => response.status === 404)).toBe(true);
	});
});

describe('AgentsPublicController deleteAgent', () => {
	const agentsService = mock<AgentsService>();
	const controller = new AgentsPublicController(agentsService);
	const req = mock<AuthenticatedRequest>();
	const res = mock<Response>();

	const agent = {
		id: 'agent-1',
		name: 'My Agent',
		projectId: 'project-1',
		availableInMCP: false,
		versionId: 'version-1',
		activeVersionId: null,
		createdAt: new Date('2025-01-02T03:04:05Z'),
		updatedAt: new Date('2025-06-07T08:09:10Z'),
	} as unknown as DeletedAgentSnapshot;

	it('deletes the agent by ID and returns its metadata', async () => {
		agentsService.delete.mockResolvedValue(agent);

		const result = await controller.deleteAgent(req, res, 'agent-1');

		expect(agentsService.delete).toHaveBeenCalledWith('agent-1');
		expect(result).toEqual({
			id: 'agent-1',
			name: 'My Agent',
			projectId: 'project-1',
			availableInMCP: false,
			versionId: 'version-1',
			activeVersionId: null,
			createdAt: '2025-01-02T03:04:05.000Z',
			updatedAt: '2025-06-07T08:09:10.000Z',
		});
	});

	it('answers 404 when the agent does not exist', async () => {
		agentsService.delete.mockResolvedValue(null);

		await expect(controller.deleteAgent(req, res, 'missing-agent')).rejects.toThrow(NotFoundError);
	});
});
