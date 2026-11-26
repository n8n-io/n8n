import { CreateAgentSkillDto } from '@n8n/api-types';
import type { AuthenticatedRequest, User } from '@n8n/db';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';
import type { AgentSkillsService } from '../agent-skills.service';
import type { AgentWriteLockService } from '../agent-write-lock.service';
import { AgentsSkillsController } from '../agents-skills.controller';
import {
	expectProjectScopedAgentRoutes,
	getRoutesByHandlerName,
} from './test-utils/controller-route-metadata';

describe('AgentsSkillsController route access scopes', () => {
	expectProjectScopedAgentRoutes(AgentsSkillsController);

	const routes = getRoutesByHandlerName(AgentsSkillsController);

	it.each([
		['listSkills', 'agent:read'],
		['getSkill', 'agent:read'],
		['createSkill', 'agent:update'],
		['updateSkill', 'agent:update'],
		['deleteSkill', 'agent:update'],
	])('%s uses %s', (handlerName, scope) => {
		expect(routes.get(handlerName)?.accessScope?.scope).toBe(scope);
	});
});

it('passes attribution separately from the skill body', async () => {
	const service = mock<AgentSkillsService>();
	const controller = new AgentsSkillsController(service, mock<AgentWriteLockService>());
	const req = mock<AuthenticatedRequest<{ projectId: string; agentId: string }>>({
		params: { projectId: 'project-1', agentId: 'agent-1' },
		user: mock<User>({ id: 'user-1' }),
	});
	const skill = { name: 'Writing', description: 'Write clearly.', instructions: 'Be brief.' };
	const telemetry = {
		navigation_source: 'agent_picker',
		flow_id: 'b23b6134-b7a7-4912-a635-6d38cbbe0ae8',
	};
	await controller.createSkill(
		req,
		mock<Response>(),
		'agent-1',
		CreateAgentSkillDto.parse({ ...skill, telemetry }),
	);
	expect(service.createAndAttachSkill).toHaveBeenCalledWith(
		'agent-1',
		'project-1',
		skill,
		expect.any(Object),
		undefined,
		undefined,
		telemetry,
	);
});
