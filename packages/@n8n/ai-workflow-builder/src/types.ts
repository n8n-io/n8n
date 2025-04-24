import type { IWorkflowBase } from 'n8n-workflow';

export type SimpleWorkflow = Pick<IWorkflowBase, 'nodes' | 'connections'>;
export interface CodeDiffMessage {
	role: 'assistant';
	type: 'code-diff';
	description?: string;
	codeDiff?: string;
	suggestionId: string;
	solution_count: number;
}

export interface QuickReplyOption {
	text: string;
	type: string;
	isFeedback?: boolean;
}

export interface AssistantChatMessage {
	role: 'assistant';
	type: 'message';
	text: string;
	step?: string;
	codeSnippet?: string;
}

export interface AssistantSummaryMessage {
	role: 'assistant';
	type: 'summary';
	title: string;
	content: string;
}

export interface EndSessionMessage {
	role: 'assistant';
	type: 'event';
	eventName: 'end-session';
}

export interface AgentChatMessage {
	role: 'assistant';
	type: 'agent-suggestion';
	title: string;
	text: string;
}

export interface AgentThinkingStep {
	role: 'assistant';
	type: 'intermediate-step';
	text: string;
	step: string;
}

export interface WorkflowStepMessage {
	role: 'assistant';
	type: 'workflow-step';
	steps: string[];
	id: string;
	read: boolean;
}

export interface WorkflowNodeMessage {
	role: 'assistant';
	type: 'workflow-node';
	nodes: string[];
	id: string;
	read: boolean;
}

export interface WorkflowComposedMessage {
	role: 'assistant';
	type: 'workflow-composed';
	nodes: Array<{
		parameters: Record<string, unknown>;
		type: string;
		name: string;
		position: [number, number];
	}>;
	id: string;
	read: boolean;
}

export interface WorkflowConnectionsMessage {
	role: 'assistant';
	type: 'workflow-connections';
	workflowJSON: SimpleWorkflow;
	id: string;
	read: boolean;
}

export type MessageResponse =
	| ((
			| AssistantChatMessage
			| CodeDiffMessage
			| AssistantSummaryMessage
			| AgentChatMessage
			| AgentThinkingStep
			| WorkflowStepMessage
			| WorkflowNodeMessage
			| WorkflowComposedMessage
			| WorkflowConnectionsMessage
	  ) & {
			quickReplies?: QuickReplyOption[];
	  })
	| EndSessionMessage;
