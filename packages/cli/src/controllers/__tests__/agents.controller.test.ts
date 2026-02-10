import type { User } from '@n8n/db';
import type {
	UserRepository,
	WorkflowRepository,
	ProjectRelationRepository,
	ProjectRepository,
} from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { Request, Response } from 'express';

import { AgentsController, buildSystemPrompt } from '../agents.controller';

import type { ActiveExecutions } from '@/active-executions';
import type { CredentialsService } from '@/credentials/credentials.service';
import type { WorkflowRunner } from '@/workflow-runner';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowSharingService } from '@/workflows/workflow-sharing.service';

function makeAgent(overrides: Partial<User> = {}): User {
	return mock<User>({
		id: 'agent-1',
		firstName: 'TestAgent',
		lastName: '',
		email: 'agent-test@internal.n8n.local',
		type: 'agent',
		avatar: null,
		description: null,
		agentAccessLevel: 'open',
		...overrides,
	});
}

describe('AgentsController', () => {
	const userRepository = mock<UserRepository>();
	const workflowRepository = mock<WorkflowRepository>();
	const workflowSharingService = mock<WorkflowSharingService>();
	const credentialsService = mock<CredentialsService>();
	const projectRelationRepository = mock<ProjectRelationRepository>();
	const projectRepository = mock<ProjectRepository>();
	const workflowFinderService = mock<WorkflowFinderService>();
	const workflowRunner = mock<WorkflowRunner>();
	const activeExecutions = mock<ActiveExecutions>();

	let controller: AgentsController;

	beforeEach(() => {
		jest.clearAllMocks();
		controller = new AgentsController(
			userRepository,
			workflowRepository,
			workflowSharingService,
			credentialsService,
			projectRelationRepository,
			projectRepository,
			workflowFinderService,
			workflowRunner,
			activeExecutions,
		);
	});

	describe('getAgentCard', () => {
		it('should return valid A2A agent card schema', async () => {
			const agent = makeAgent({ description: 'Handles docs' });
			userRepository.findOneBy.mockResolvedValue(agent);

			const req = mock<Request>({ protocol: 'https' });
			req.get.mockReturnValue('example.com');

			const result = await controller.getAgentCard(req, mock<Response>(), 'agent-1');

			expect(result).toEqual({
				id: 'agent-1',
				name: 'TestAgent',
				provider: { name: 'n8n', description: 'Handles docs' },
				capabilities: {
					streaming: false,
					pushNotifications: false,
					multiTurn: true,
				},
				skills: [],
				interfaces: [
					{
						type: 'http+json',
						url: 'https://example.com/rest/agents/agent-1/task',
					},
				],
				securitySchemes: {
					apiKey: {
						type: 'apiKey',
						name: 'x-n8n-api-key',
						in: 'header',
					},
				},
				security: [{ apiKey: [] }],
			});
		});

		it('should return 404 for non-existent agent', async () => {
			userRepository.findOneBy.mockResolvedValue(null);

			const req = mock<Request>();
			await expect(controller.getAgentCard(req, mock<Response>(), 'nonexistent')).rejects.toThrow(
				'Agent nonexistent not found',
			);
		});

		it('should return 404 for closed agent', async () => {
			const agent = makeAgent({ agentAccessLevel: 'closed' });
			userRepository.findOneBy.mockResolvedValue(agent);

			const req = mock<Request>();
			await expect(controller.getAgentCard(req, mock<Response>(), 'agent-1')).rejects.toThrow(
				'Agent agent-1 not found',
			);
		});

		it('should declare streaming as false and multiTurn as true', async () => {
			const agent = makeAgent();
			userRepository.findOneBy.mockResolvedValue(agent);

			const req = mock<Request>({ protocol: 'http' });
			req.get.mockReturnValue('localhost:5678');

			const result = await controller.getAgentCard(req, mock<Response>(), 'agent-1');

			expect(result.capabilities.streaming).toBe(false);
			expect(result.capabilities.multiTurn).toBe(true);
		});

		it('should point interfaces URL to the correct task endpoint', async () => {
			const agent = makeAgent();
			userRepository.findOneBy.mockResolvedValue(agent);

			const req = mock<Request>({ protocol: 'http' });
			req.get.mockReturnValue('localhost:5678');

			const result = await controller.getAgentCard(req, mock<Response>(), 'agent-1');

			expect(result.interfaces[0].url).toBe('http://localhost:5678/rest/agents/agent-1/task');
		});

		it('should declare apiKey security scheme with x-n8n-api-key header', async () => {
			const agent = makeAgent();
			userRepository.findOneBy.mockResolvedValue(agent);

			const req = mock<Request>({ protocol: 'https' });
			req.get.mockReturnValue('example.com');

			const result = await controller.getAgentCard(req, mock<Response>(), 'agent-1');

			expect(result.securitySchemes.apiKey).toEqual({
				type: 'apiKey',
				name: 'x-n8n-api-key',
				in: 'header',
			});
			expect(result.security).toEqual([{ apiKey: [] }]);
		});

		it('should use empty string when description is null', async () => {
			const agent = makeAgent({ description: null });
			userRepository.findOneBy.mockResolvedValue(agent);

			const req = mock<Request>({ protocol: 'https' });
			req.get.mockReturnValue('example.com');

			const result = await controller.getAgentCard(req, mock<Response>(), 'agent-1');

			expect(result.provider.description).toBe('');
		});
	});

	describe('buildSystemPrompt', () => {
		it('should include send_message instructions when canDelegate is true', () => {
			const agents = [{ firstName: 'Helper', description: 'Helps with things' }];
			const prompt = buildSystemPrompt('TestAgent', [], agents, true);

			expect(prompt).toContain('send_message');
			expect(prompt).toContain('Helper: Helps with things');
		});

		it('should exclude send_message when canDelegate is false', () => {
			const agents = [{ firstName: 'Helper', description: 'Helps' }];
			const prompt = buildSystemPrompt('TestAgent', [], agents, false);

			expect(prompt).not.toContain('send_message');
			expect(prompt).not.toContain('Helper');
		});

		it('should use description in agent list', () => {
			const agents = [
				{ firstName: 'DocBot', description: 'Knowledge Base' },
				{ firstName: 'QABot', description: '' },
			];
			const prompt = buildSystemPrompt('TestAgent', [], agents, true);

			expect(prompt).toContain('- DocBot: Knowledge Base');
			expect(prompt).toContain('- QABot');
			expect(prompt).not.toContain('QABot:');
		});

		it('should list workflows when provided', () => {
			const workflows = [
				{ id: 'wf-1', name: 'Deploy', active: true },
				{ id: 'wf-2', name: 'Test', active: false },
			];
			const prompt = buildSystemPrompt('TestAgent', workflows, [], false);

			expect(prompt).toContain('Deploy (id: wf-1, active: true)');
			expect(prompt).toContain('Test (id: wf-2, active: false)');
		});

		it('should show (none) when no workflows', () => {
			const prompt = buildSystemPrompt('TestAgent', [], [], false);
			expect(prompt).toContain('(none)');
		});

		it('should only allow execute_workflow and complete when canDelegate is false', () => {
			const prompt = buildSystemPrompt('TestAgent', [], [], false);
			expect(prompt).toContain('"execute_workflow" or "complete"');
			expect(prompt).not.toContain('"send_message"');
		});
	});

	describe('createAgent', () => {
		it('should save description and agentAccessLevel', async () => {
			const user = makeAgent({ description: null, agentAccessLevel: null });
			userRepository.createUserWithProject.mockResolvedValue({
				user,
				project: mock(),
			});
			userRepository.save.mockResolvedValue({
				...user,
				description: 'Test desc',
				agentAccessLevel: 'open',
			} as User);

			const result = await controller.createAgent(mock(), mock<Response>(), {
				firstName: 'TestAgent',
				description: 'Test desc',
				agentAccessLevel: 'open',
			} as never);

			expect(userRepository.save).toHaveBeenCalled();
			expect(result.description).toBe('Test desc');
			expect(result.agentAccessLevel).toBe('open');
		});
	});

	describe('updateAgent', () => {
		it('should update description and agentAccessLevel', async () => {
			const agent = makeAgent();
			userRepository.findOneBy.mockResolvedValue(agent);
			userRepository.save.mockResolvedValue({
				...agent,
				description: 'Updated desc',
				agentAccessLevel: 'internal',
			} as User);

			const result = await controller.updateAgent(mock(), mock<Response>(), 'agent-1', {
				description: 'Updated desc',
				agentAccessLevel: 'internal',
			} as never);

			expect(result.description).toBe('Updated desc');
			expect(result.agentAccessLevel).toBe('internal');
		});

		it('should return 404 for non-existent agent', async () => {
			userRepository.findOneBy.mockResolvedValue(null);

			await expect(
				controller.updateAgent(mock(), mock<Response>(), 'bad-id', {} as never),
			).rejects.toThrow('Agent bad-id not found');
		});
	});

	describe('getCapabilities', () => {
		it('should include description and agentAccessLevel in response', async () => {
			const agent = makeAgent({
				description: 'A helpful agent',
				agentAccessLevel: 'open',
			});
			userRepository.findOne.mockResolvedValue(agent);
			workflowSharingService.getSharedWorkflowIds.mockResolvedValue([]);
			credentialsService.getMany.mockResolvedValue([]);
			projectRelationRepository.findAllByUser.mockResolvedValue([]);

			const result = await controller.getCapabilities(mock(), mock<Response>(), 'agent-1');

			expect(result.description).toBe('A helpful agent');
			expect(result.agentAccessLevel).toBe('open');
		});
	});
});
