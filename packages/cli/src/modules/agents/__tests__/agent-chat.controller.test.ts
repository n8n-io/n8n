import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { AgentChatController } from '../agent-chat.controller';
import type { AgentExecutionOrchestratorService } from '../agent-execution-orchestrator.service';
import type { AgentExecutionService } from '../agent-execution.service';
import type { FlushableResponse } from '../agent-sse-stream';
import type { AgentTestChatService } from '../agent-test-chat.service';
import type { AgentsService } from '../agents.service';
import type { AgentValidationService } from '../agent-validation.service';
import type { AgentsBuilderService } from '../builder/agents-builder.service';
import {
	expectProjectScopedAgentRoutes,
	getRoutesByHandlerName,
} from './test-utils/controller-route-metadata';

function makeController() {
	const agentsService =
		mock<Pick<AgentsService, 'findById' | 'findByProjectId' | 'findByProjectIdPaginated'>>();
	const agentExecutionOrchestratorService = mock<AgentExecutionOrchestratorService>();
	const agentsBuilderService = mock<AgentsBuilderService>();
	const agentValidationService = mock<AgentValidationService>();
	const agentExecutionService = mock<AgentExecutionService>();
	agentValidationService.validateAgentIsRunnable.mockResolvedValue({ missing: [] });

	const controller = new AgentChatController(
		agentExecutionOrchestratorService,
		mock<AgentTestChatService>(),
		agentValidationService,
		agentsBuilderService,
		mock<CredentialsService>(),
		agentExecutionService,
		agentsService as unknown as AgentsService,
	);

	return {
		controller,
		agentExecutionOrchestratorService,
		agentValidationService,
		agentExecutionService,
		agentsService: {
			findById: agentsService.findById,
			getConversationHistory: agentExecutionOrchestratorService.getConversationHistory,
		} as Mocked<
			Pick<AgentsService, 'findById'> &
				Pick<AgentExecutionOrchestratorService, 'getConversationHistory'>
		>,
	};
}

describe('AgentChatController route access scopes', () => {
	expectProjectScopedAgentRoutes(AgentChatController);

	const routes = getRoutesByHandlerName(AgentChatController);

	it.each([
		['chat', 'agent:execute'],
		['chatResume', 'agent:execute'],
		['getChatMessages', 'agent:read'],
		['getTestChatMessages', 'agent:read'],
		['clearTestChatMessages', 'agent:update'],
	])('%s uses %s', (handlerName, scope) => {
		expect(routes.get(handlerName)?.accessScope?.scope).toBe(scope);
	});
});

describe('AgentChatController chat message history', () => {
	it('returns conversation history envelope from the execution orchestrator', async () => {
		const { controller, agentsService } = makeController();
		agentsService.findById.mockResolvedValue({ id: 'agent-1' } as never);
		agentsService.getConversationHistory.mockResolvedValue([
			{
				id: 'execution-1:user',
				role: 'user',
				content: [{ type: 'text', text: 'Hello' }],
			},
			{
				id: 'execution-1:assistant',
				role: 'assistant',
				content: [{ type: 'text', text: 'Hi there' }],
			},
		]);

		const result = await controller.getChatMessages({
			params: { projectId: 'project-1', agentId: 'agent-1', threadId: 'thread-1' },
		} as never);

		expect(result).toEqual({
			messages: [
				{
					id: 'execution-1:user',
					role: 'user',
					content: [{ type: 'text', text: 'Hello' }],
				},
				{
					id: 'execution-1:assistant',
					role: 'assistant',
					content: [{ type: 'text', text: 'Hi there' }],
				},
			],
			openSuspensions: [],
		});
		expect(agentsService.getConversationHistory).toHaveBeenCalledWith({
			threadId: 'thread-1',
			projectId: 'project-1',
			agentId: 'agent-1',
		});
	});

	it('rejects missing conversation history', async () => {
		const { controller, agentsService } = makeController();
		agentsService.findById.mockResolvedValue({ id: 'agent-1' } as never);
		agentsService.getConversationHistory.mockResolvedValue(null);

		await expect(
			controller.getChatMessages({
				params: { projectId: 'project-1', agentId: 'agent-1', threadId: 'thread-1' },
			} as never),
		).rejects.toThrow(NotFoundError);
	});
});

describe('AgentChatController SSE done payload', () => {
	it('includes executionId on done when recorded', async () => {
		const { controller, agentExecutionOrchestratorService, agentExecutionService } =
			makeController();
		agentExecutionService.findThreadById.mockResolvedValue(null);
		agentExecutionOrchestratorService.executeForChat.mockImplementation(async function* (config) {
			config.onExecutionRecorded?.('exec-99');
			yield* [];
		});

		const writes: string[] = [];
		const res = mock<FlushableResponse>();
		res.write.mockImplementation((chunk: string) => {
			writes.push(String(chunk));
			return true;
		});

		await controller.chat(
			{ params: { projectId: 'project-1' }, user: { id: 'user-1' } } as never,
			res,
			'agent-1',
			{ message: 'hi', sessionId: 'thread-1' } as never,
		);

		const events = writes
			.filter((line) => line.startsWith('data: '))
			.map((line) => JSON.parse(line.slice(6).trim()) as { type: string });

		expect(events).toContainEqual({
			type: 'done',
			sessionId: 'thread-1',
			executionId: 'exec-99',
		});
	});

	it('includes executionId on resume done when recorded', async () => {
		const { controller, agentExecutionOrchestratorService } = makeController();
		agentExecutionOrchestratorService.resumeForChat.mockImplementation(async function* (config) {
			config.onExecutionRecorded?.('exec-resume-1');
			yield* [];
		});

		const writes: string[] = [];
		const res = mock<FlushableResponse>();
		res.write.mockImplementation((chunk: string) => {
			writes.push(String(chunk));
			return true;
		});

		await controller.chatResume(
			{ params: { projectId: 'project-1' }, user: { id: 'user-1' } } as never,
			res,
			'agent-1',
			{ runId: 'run-1', toolCallId: 'tc-1', resumeData: { approved: true } } as never,
		);

		const events = writes
			.filter((line) => line.startsWith('data: '))
			.map((line) => JSON.parse(line.slice(6).trim()) as { type: string });

		expect(events).toContainEqual({
			type: 'done',
			executionId: 'exec-resume-1',
		});
	});
});
