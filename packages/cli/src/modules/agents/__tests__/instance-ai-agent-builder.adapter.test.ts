// `createAdapter` builds a proxy fetch eagerly; stub it out — these tests never
// exercise the MCP path.
vi.mock('@/utils/ai-proxy-fetch', () => ({ createAiMcpFetch: vi.fn() }));

import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import * as checkAccess from '@/permissions.ee/check-access';

import type { AgentConfigService } from '../agent-config.service';
import type { AgentCustomToolsService } from '../agent-custom-tools.service';
import type { AgentSkillsService } from '../agent-skills.service';
import type { AgentTaskService } from '../agent-task.service';
import type { AgentsService } from '../agents.service';
import type { AttachableWorkflowsService } from '../attachable-workflows.service';
import { InstanceAiAgentBuilderAdapterService } from '../instance-ai-agent-builder.adapter';

// The adapter only imports types from `@n8n/instance-ai`, so the barrel never
// needs to load at runtime here.

function setup() {
	const agentsService = mock<AgentsService>();
	const agentConfigService = mock<AgentConfigService>();
	const agentSkillsService = mock<AgentSkillsService>();
	const agentTaskService = mock<AgentTaskService>();
	const agentCustomToolsService = mock<AgentCustomToolsService>();
	const attachableWorkflowsService = mock<AttachableWorkflowsService>();

	const service = new InstanceAiAgentBuilderAdapterService(
		agentsService,
		agentConfigService,
		agentSkillsService,
		agentTaskService,
		agentCustomToolsService,
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		attachableWorkflowsService,
	);

	const user = mock<User>({ id: 'user-1' });
	const adapter = service.createAdapter(user, 'project-1');

	return {
		adapter,
		user,
		agentsService,
		agentConfigService,
		agentSkillsService,
		agentTaskService,
		agentCustomToolsService,
		attachableWorkflowsService,
	};
}

describe('InstanceAiAgentBuilderAdapterService scope enforcement', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('when the user lacks the required project scope', () => {
		beforeEach(() => {
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(false);
		});

		it('createAgent throws ForbiddenError and does not create the agent', async () => {
			const { adapter, agentsService } = setup();

			await expect(adapter.createAgent('My agent', 'project-1')).rejects.toThrow(ForbiddenError);

			expect(checkAccess.userHasScopes).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'user-1' }),
				['agent:create'],
				false,
				{ projectId: 'project-1' },
			);
			expect(agentsService.create).not.toHaveBeenCalled();
		});

		it('updateConfig throws ForbiddenError and does not update the config', async () => {
			const { adapter, agentConfigService } = setup();

			await expect(adapter.updateConfig('agent-1', 'project-1', mock())).rejects.toThrow(
				ForbiddenError,
			);

			expect(checkAccess.userHasScopes).toHaveBeenCalledWith(
				expect.anything(),
				['agent:update'],
				false,
				{ projectId: 'project-1' },
			);
			expect(agentConfigService.updateConfig).not.toHaveBeenCalled();
		});

		it('createSkill throws ForbiddenError and does not create the skill', async () => {
			const { adapter, agentSkillsService } = setup();

			await expect(
				adapter.createSkill('agent-1', 'project-1', {
					name: 'n',
					description: 'd',
					instructions: 'i',
				}),
			).rejects.toThrow(ForbiddenError);

			expect(agentSkillsService.createSkill).not.toHaveBeenCalled();
		});

		it('createTask throws ForbiddenError and does not create the task', async () => {
			const { adapter, agentTaskService } = setup();

			await expect(
				adapter.createTask('agent-1', 'project-1', {
					name: 'n',
					objective: 'o',
					cronExpression: '0 9 * * *',
					enabled: true,
				}),
			).rejects.toThrow(ForbiddenError);

			expect(agentTaskService.create).not.toHaveBeenCalled();
		});

		it('buildCustomTool throws ForbiddenError and does not build the tool', async () => {
			const { adapter, agentCustomToolsService } = setup();

			await expect(adapter.buildCustomTool('agent-1', 'project-1', 'code', mock())).rejects.toThrow(
				ForbiddenError,
			);

			expect(agentCustomToolsService.buildCustomTool).not.toHaveBeenCalled();
		});

		it('getConfigSnapshot throws ForbiddenError and does not read the agent', async () => {
			const { adapter, agentsService } = setup();

			await expect(adapter.getConfigSnapshot('agent-1', 'project-1')).rejects.toThrow(
				ForbiddenError,
			);

			expect(checkAccess.userHasScopes).toHaveBeenCalledWith(
				expect.anything(),
				['agent:read'],
				false,
				{ projectId: 'project-1' },
			);
			expect(agentsService.findById).not.toHaveBeenCalled();
		});

		it('listProjectAgents throws ForbiddenError and does not list agents', async () => {
			const { adapter, agentsService } = setup();

			await expect(adapter.listProjectAgents('project-1', 'agent-1')).rejects.toThrow(
				ForbiddenError,
			);

			expect(checkAccess.userHasScopes).toHaveBeenCalledWith(
				expect.anything(),
				['agent:read'],
				false,
				{ projectId: 'project-1' },
			);
			expect(agentsService.findByProjectId).not.toHaveBeenCalled();
		});
	});

	describe('when the user holds the required project scope', () => {
		beforeEach(() => {
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
		});

		it('createAgent delegates to the agents service', async () => {
			const { adapter, agentsService } = setup();
			agentsService.create.mockResolvedValue({
				id: 'agent-1',
				name: 'My agent',
			} as never);

			const result = await adapter.createAgent('My agent', 'project-1');

			expect(agentsService.create).toHaveBeenCalledWith('project-1', 'My agent');
			expect(result).toEqual({ agentId: 'agent-1', projectId: 'project-1', name: 'My agent' });
		});

		it('createTask rejects an agent outside the scoped project', async () => {
			const { adapter, agentsService, agentTaskService } = setup();
			agentsService.findById.mockResolvedValue(null);

			await expect(
				adapter.createTask('agent-other-project', 'project-1', {
					name: 'n',
					objective: 'o',
					cronExpression: '0 9 * * *',
					enabled: true,
				}),
			).rejects.toThrow(NotFoundError);

			expect(agentsService.findById).toHaveBeenCalledWith('agent-other-project', 'project-1');
			expect(agentTaskService.create).not.toHaveBeenCalled();
		});

		it('createTask delegates to the task service with the agent id', async () => {
			const { adapter, agentsService, agentTaskService } = setup();
			agentsService.findById.mockResolvedValue(mock());
			agentTaskService.create.mockResolvedValue({
				id: 'task-1',
				name: 'n',
				objective: 'o',
				cronExpression: '0 9 * * *',
			} as never);

			const result = await adapter.createTask('agent-1', 'project-1', {
				name: 'n',
				objective: 'o',
				cronExpression: '0 9 * * *',
				enabled: true,
			});

			expect(agentTaskService.create).toHaveBeenCalledWith('agent-1', {
				name: 'n',
				objective: 'o',
				cronExpression: '0 9 * * *',
				enabled: true,
			});
			expect(result).toEqual({
				id: 'task-1',
				name: 'n',
				objective: 'o',
				cronExpression: '0 9 * * *',
			});
		});

		it('listAttachableWorkflows delegates to the RBAC-scoped workflows service', async () => {
			const { adapter, user, attachableWorkflowsService } = setup();
			const workflows = [{ name: 'Send Email', active: true, triggerType: 'manual' }];
			attachableWorkflowsService.list.mockResolvedValue(workflows);

			const result = await adapter.listAttachableWorkflows('project-1', 'billing');

			expect(attachableWorkflowsService.list).toHaveBeenCalledWith(user, 'project-1', 'billing');
			expect(result).toBe(workflows);
		});
	});
});
