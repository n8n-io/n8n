import type { AgentProviderModelsQueryDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import type { AgentIntegrationPersistenceService } from '../agent-integration-persistence.service';
import type { AgentModelCatalogService } from '../agent-model-catalog.service';
import { AgentsCatalogController } from '../agents-catalog.controller';
import {
	expectProjectScopedAgentRoutes,
	getRoutesByHandlerName,
} from './test-utils/controller-route-metadata';

describe('AgentsCatalogController route access scopes', () => {
	expectProjectScopedAgentRoutes(AgentsCatalogController);

	const routes = getRoutesByHandlerName(AgentsCatalogController);

	it.each([
		['getModelCatalog', 'agent:read'],
		['getProviderModels', 'agent:read'],
		['listIntegrations', 'agent:read'],
	])('%s uses %s', (handlerName, scope) => {
		expect(routes.get(handlerName)?.accessScope?.scope).toBe(scope);
	});
});

describe('AgentsCatalogController — getProviderModels', () => {
	function makeController() {
		const modelCatalogService = mock<AgentModelCatalogService>();
		const controller = new AgentsCatalogController(
			mock<AgentIntegrationPersistenceService>(),
			modelCatalogService,
		);
		return { controller, modelCatalogService };
	}

	const req = mock<AuthenticatedRequest<{ projectId: string }>>({
		user: { id: 'user-1' },
		params: { projectId: 'project-1' },
	});

	it('delegates to the model catalog service with the user, project, and credential', async () => {
		const { controller, modelCatalogService } = makeController();
		const response = { provider: 'anthropic', verified: true, models: [] };
		modelCatalogService.getProviderModels.mockResolvedValue(response);

		const result = await controller.getProviderModels(req, mock<Response>(), 'anthropic', {
			credentialId: 'cred-1',
		} as AgentProviderModelsQueryDto);

		expect(result).toBe(response);
		expect(modelCatalogService.getProviderModels).toHaveBeenCalledWith(
			req.user,
			'project-1',
			'anthropic',
			'cred-1',
		);
	});

	it('rejects unknown providers', async () => {
		const { controller } = makeController();

		await expect(
			controller.getProviderModels(
				req,
				mock<Response>(),
				'not-a-provider',
				{} as AgentProviderModelsQueryDto,
			),
		).rejects.toThrow(BadRequestError);
	});
});
