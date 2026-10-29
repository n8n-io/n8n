import type { AgentTokenUsage } from '../agent-sse';
import type { AgentActor } from '../agents/types';

export type AgentExecutionUpdated = {
	type: 'agentExecutionUpdated';
	data: {
		projectId: string;
		agentId: string;
		threadId: string;
		executionId: string;
		usage?: AgentTokenUsage;
		/** Execution duration in milliseconds, measured on the server. */
		duration?: number;
		complete?: boolean;
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
		/** Older senders can omit the writing surface. */
		source?: AgentActor;
	};
};

export type AgentMessageQueueUpdated = {
	type: 'agentMessageQueueUpdated';
	data: { projectId: string; agentId: string; threadId: string };
};

export type AgentsPushMessage =
	| AgentExecutionUpdated
	| AgentUpdated
	| AgentBackgroundJobsUpdated
	| AgentMessageQueueUpdated;
