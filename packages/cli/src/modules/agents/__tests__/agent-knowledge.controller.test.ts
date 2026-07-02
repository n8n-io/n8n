import type { Mocked } from 'vitest';
import type { AgentsConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';
import multer from 'multer';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { AgentKnowledgeController } from '../agent-knowledge.controller';
import type { AgentKnowledgeService } from '../agent-knowledge.service';
import type { AgentRuntimeCacheService } from '../agent-runtime-cache.service';
import {
	expectProjectScopedAgentRoutes,
	getRoutesByHandlerName,
} from './test-utils/controller-route-metadata';

function makeController({
	agentKnowledgeService = mock<AgentKnowledgeService>(),
	agentsConfig = {
		sandboxEnabled: true,
		sandboxProvider: 'daytona',
		daytonaVolumeId: 'volume-1',
	} as AgentsConfig,
	runtimeCacheService = mock<AgentRuntimeCacheService>(),
}: {
	agentKnowledgeService?: Mocked<AgentKnowledgeService>;
	agentsConfig?: AgentsConfig;
	runtimeCacheService?: Mocked<AgentRuntimeCacheService>;
} = {}) {
	return {
		controller: new AgentKnowledgeController(
			agentKnowledgeService,
			agentsConfig,
			runtimeCacheService,
		),
		agentKnowledgeService,
		runtimeCacheService,
	};
}

describe('AgentKnowledgeController route access scopes', () => {
	expectProjectScopedAgentRoutes(AgentKnowledgeController);

	const routes = getRoutesByHandlerName(AgentKnowledgeController);

	it.each([
		['listFiles', 'agent:read'],
		['uploadFiles', 'agent:update'],
		['deleteFile', 'agent:update'],
	])('%s uses %s', (handlerName, scope) => {
		expect(routes.get(handlerName)?.accessScope?.scope).toBe(scope);
	});
});

describe('AgentKnowledgeController file uploads', () => {
	it('passes the authenticated user id to file upload storage and clears runtime cache', async () => {
		const { controller, agentKnowledgeService, runtimeCacheService } = makeController();
		const files = [{ path: '/tmp/uploaded-file' }];
		const uploaded = [{ id: 'file-1', name: 'uploaded-file' }];
		agentKnowledgeService.uploadFiles.mockResolvedValue(uploaded as never);

		await expect(
			controller.uploadFiles(
				{
					params: { projectId: 'project-1' },
					user: { id: 'user-1' },
					files,
				} as never,
				undefined as never,
				'project-1',
				'agent-1',
			),
		).resolves.toBe(uploaded);

		expect(agentKnowledgeService.uploadFiles).toHaveBeenCalledWith(
			'agent-1',
			'project-1',
			files,
			'user-1',
		);
		expect(runtimeCacheService.clearRuntimes).toHaveBeenCalledWith('agent-1');
	});

	it('rejects empty uploads', async () => {
		const { controller } = makeController();

		await expect(
			controller.uploadFiles(
				{ params: { projectId: 'project-1' }, files: [] } as never,
				undefined as never,
				'project-1',
				'agent-1',
			),
		).rejects.toThrow(BadRequestError);
	});

	it('maps multer upload validation errors to bad requests', async () => {
		const { controller } = makeController();

		await expect(
			controller.uploadFiles(
				{
					params: { projectId: 'project-1' },
					fileUploadError: new multer.MulterError('LIMIT_FILE_COUNT'),
				} as never,
				undefined as never,
				'project-1',
				'agent-1',
			),
		).rejects.toThrow(BadRequestError);
	});
});

describe('AgentKnowledgeController file deletion', () => {
	it('passes the authenticated user id to file deletion and clears runtime cache', async () => {
		const { controller, agentKnowledgeService, runtimeCacheService } = makeController();

		await expect(
			controller.deleteFile(
				{
					params: { projectId: 'project-1' },
					user: { id: 'user-1' },
				} as never,
				undefined as never,
				'project-1',
				'agent-1',
				'file-1',
			),
		).resolves.toEqual({ success: true });

		expect(agentKnowledgeService.deleteFile).toHaveBeenCalledWith(
			'agent-1',
			'project-1',
			'file-1',
			'user-1',
		);
		expect(runtimeCacheService.clearRuntimes).toHaveBeenCalledWith('agent-1');
	});
});

describe('AgentKnowledgeController knowledge base gating', () => {
	it('returns not found for file endpoints when the knowledge base is disabled', async () => {
		const { controller } = makeController({
			agentsConfig: {
				sandboxEnabled: false,
				sandboxProvider: 'daytona',
				daytonaVolumeId: 'volume-1',
			} as AgentsConfig,
		});

		await expect(
			controller.listFiles(
				{ params: { projectId: 'project-1' } } as never,
				undefined as never,
				'project-1',
				'agent-1',
			),
		).rejects.toThrow(NotFoundError);
		await expect(
			controller.uploadFiles(
				{ params: { projectId: 'project-1' }, files: [] } as never,
				undefined as never,
				'project-1',
				'agent-1',
			),
		).rejects.toThrow(NotFoundError);
		await expect(
			controller.deleteFile(
				{ params: { projectId: 'project-1' } } as never,
				undefined as never,
				'project-1',
				'agent-1',
				'file-1',
			),
		).rejects.toThrow(NotFoundError);
	});
});
