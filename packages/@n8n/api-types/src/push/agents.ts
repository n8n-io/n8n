import type { AgentSseEvent } from '../agent-sse';
import type { AgentChatQueueItem } from '../agents/types';

export type AgentExecutionUpdated = {
	type: 'agentExecutionUpdated';
	data: {
		projectId: string;
		agentId: string;
		threadId: string;
		executionId: string;
	};
};

export type AgentBackgroundJobsUpdated = {
	type: 'agentBackgroundTasksUpdated';
	data: {
		projectId: string;
		agentId: string;
		threadId: string;
	};
};

export type AgentUpdated = {
	type: 'agentUpdated';
	data: {
		projectId: string;
		agentId: string;
	};
};

export type AgentsPushMessage =
	| AgentExecutionUpdated
	| AgentUpdated
	| AgentBackgroundJobsUpdated
	| AgentChatEvent;
export type AgentChatEvent = {
	type: 'agentChatEvent';
	data: {
		projectId: string;
		agentId: string;
		threadId: string;
		queueId: string;
		clientRequestId: string;
		event:
			| AgentSseEvent
			| { type: 'processing'; item: AgentChatQueueItem }
			| { type: 'execution-started'; executionId: string }
			| { type: 'removed' }
			| { type: 'cancelled' };
	};
};
