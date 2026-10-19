import { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import { AgentChatExecutionService } from '../agent-chat-execution.service';
import { AgentExecutionService } from '../agent-execution.service';
import { AgentMessageQueueService } from '../agent-message-queue.service';
import { AgentMessageSteeringService } from '../agent-message-steering.service';
import { AgentToolApprovalService } from '../agent-tool-approval.service';
import { AgentTurnExecutionService, type AgentTurnRequest } from '../agent-turn-execution.service';

it('ends a preview turn stopped during preparation without recording an error', async () => {
	const executions = mock<AgentExecutionService>();
	const chatExecutions = mock<AgentChatExecutionService>();
	chatExecutions.withTurnLock.mockImplementation(
		async (_threadId, action) => await action(new AbortController().signal),
	);
	const service = new AgentTurnExecutionService(
		mock<Logger>(),
		executions,
		chatExecutions,
		mock<AgentMessageQueueService>(),
		mock<AgentMessageSteeringService>(),
		mock<AgentToolApprovalService>(),
	);
	const controller = new AbortController();
	const turn: AgentTurnRequest = {
		type: 'start',
		input: 'Continue',
		options: { abortSignal: controller.signal },
		recording: {
			projectId: 'project',
			agentId: 'agent',
			agentName: 'Agent',
			threadId: 'thread',
			resourceId: 'draft-chat:user',
			userMessage: 'Continue',
			source: 'chat',
			access: { accessScope: 'user', ownerId: 'user' },
		},
	};
	const chunks = [];
	for await (const chunk of service.execute({
		agentInstance: mock(),
		toolRegistry: new Map(),
		mcpServerAttributions: new Map(),
		context: turn.recording,
		chatSurface: 'preview',
		prepare: async () => {
			controller.abort();
			return turn;
		},
	}))
		chunks.push(chunk);
	expect(chunks).toEqual([]);
	expect(executions.startExecutionRecording).not.toHaveBeenCalled();
});
