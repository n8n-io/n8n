import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { AgentsController } from '../agents.controller';
import type { AgentsService } from '../agents.service';
import type { AgentMemoryProfileEntity } from '../entities/agent-memory-profile.entity';
import type { AgentMemoryProfileRepository } from '../repositories/agent-memory-profile.repository';

// The webhook route is the single exception: it is `skipAuth: true` (no
// req.user) and authenticates inbound third-party callbacks via per-platform
// signature verification inside the handler.
const UNAUTHENTICATED_HANDLERS = new Set(['handleWebhook']);

const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
	AgentsController as never,
);

const routeCases = Array.from(metadata.routes.entries()).map(([handlerName, route]) => ({
	handlerName,
	route,
}));

describe('AgentsController route access scopes', () => {
	it.each(routeCases)(
		'$handlerName is gated by a project-scoped agent:* check',
		({ handlerName, route }) => {
			if (UNAUTHENTICATED_HANDLERS.has(handlerName)) {
				expect(route.accessScope).toBeUndefined();
				expect(route.skipAuth).toBe(true);
				return;
			}

			expect(route.accessScope).toBeDefined();
			expect(route.accessScope?.globalOnly).toBe(false);
			expect(route.accessScope?.scope.startsWith('agent:')).toBe(true);
		},
	);

	it.each([
		['listSkills', 'agent:read'],
		['getSkill', 'agent:read'],
		['createSkill', 'agent:update'],
		['updateSkill', 'agent:update'],
		['deleteSkill', 'agent:update'],
		['revertToPublished', 'agent:update'],
		['getMemoryProfiles', 'agent:read'],
	])('%s uses %s', (handlerName, scope) => {
		expect(metadata.routes.get(handlerName)?.accessScope?.scope).toBe(scope);
	});
});

describe('AgentsController memory profiles', () => {
	function makeController(options: {
		agent?: object | null;
		profiles?: Array<
			Pick<AgentMemoryProfileEntity, 'scopeKind' | 'agentId' | 'resourceId' | 'content'>
		>;
	}) {
		const agentsService = {
			findById: jest.fn().mockResolvedValue('agent' in options ? options.agent : { id: 'agent-1' }),
		} as unknown as jest.Mocked<Pick<AgentsService, 'findById'>>;
		const memoryProfileRepository = {
			findOneBy: jest.fn((where: { scopeKind: string; agentId: string; resourceId: string }) => {
				return (
					options.profiles?.find(
						(profile) =>
							profile.scopeKind === where.scopeKind &&
							profile.agentId === where.agentId &&
							profile.resourceId === where.resourceId,
					) ?? null
				);
			}),
		} as unknown as jest.Mocked<Pick<AgentMemoryProfileRepository, 'findOneBy'>>;
		const controller = new AgentsController(
			agentsService as unknown as AgentsService,
			{} as never,
			{} as never,
			{} as never,
			{} as never,
			{} as never,
			{} as never,
			memoryProfileRepository as unknown as AgentMemoryProfileRepository,
		);

		return { controller, agentsService, memoryProfileRepository };
	}

	function makeRequest(userId = 'user-1') {
		return {
			params: { projectId: 'project-1', agentId: 'agent-1' },
			user: { id: userId },
		} as never;
	}

	it('returns the current user profile', async () => {
		const { controller, memoryProfileRepository } = makeController({
			profiles: [
				{
					scopeKind: 'user-profile',
					agentId: 'agent-1',
					resourceId: 'user-1',
					content: 'User profile content',
				},
				{
					scopeKind: 'user-profile',
					agentId: 'agent-2',
					resourceId: 'user-1',
					content: 'Other agent profile content',
				},
				{
					scopeKind: 'user-profile',
					agentId: 'agent-1',
					resourceId: 'user-2',
					content: 'Other user profile content',
				},
			],
		});

		await expect(controller.getMemoryProfiles(makeRequest('user-1'))).resolves.toEqual({
			userProfile: 'User profile content',
		});
		expect(memoryProfileRepository.findOneBy).toHaveBeenCalledWith({
			scopeKind: 'user-profile',
			agentId: 'agent-1',
			resourceId: 'user-1',
		});
		expect(memoryProfileRepository.findOneBy).toHaveBeenCalledTimes(1);
	});

	it('returns null when profiles are missing', async () => {
		const { controller } = makeController({ profiles: [] });

		await expect(controller.getMemoryProfiles(makeRequest())).resolves.toEqual({
			userProfile: null,
		});
	});

	it('rejects agents outside the project', async () => {
		const { controller, memoryProfileRepository } = makeController({ agent: null });

		await expect(controller.getMemoryProfiles(makeRequest())).rejects.toThrow(
			'Agent "agent-1" not found',
		);
		expect(memoryProfileRepository.findOneBy).not.toHaveBeenCalled();
	});
});
