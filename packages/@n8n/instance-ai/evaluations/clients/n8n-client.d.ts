import type { InstanceAiRichMessagesResponse, InstanceAiEvalExecutionResult } from '@n8n/api-types';
export interface WorkflowNodeResponse {
	name: string;
	type: string;
	parameters?: Record<string, unknown>;
	disabled?: boolean;
	credentials?: Record<string, unknown>;
}
export interface WorkflowResponse {
	id: string;
	name: string;
	active: boolean;
	nodes: WorkflowNodeResponse[];
	connections: Record<string, unknown>;
	pinData?: Record<string, unknown>;
}
interface WorkflowListItem {
	id: string;
	name: string;
	active: boolean;
	nodes: WorkflowNodeResponse[];
}
interface ExecutionListItem {
	id: string;
	workflowId: string;
	status: string;
}
export interface ExecutionDetail {
	id: string;
	workflowId: string;
	status: string;
	data: string;
}
interface ThreadStatus {
	hasActiveRun: boolean;
	isSuspended: boolean;
	backgroundTasks: Array<{
		taskId: string;
		role: string;
		agentId: string;
		status: 'running' | 'completed' | 'failed' | 'cancelled';
		startedAt: number;
		runId?: string;
		messageGroupId?: string;
	}>;
}
export declare class N8nClient {
	private readonly baseUrl;
	private sessionCookie?;
	constructor(baseUrl: string);
	login(email?: string, password?: string): Promise<void>;
	sendMessage(
		threadId: string,
		message: string,
	): Promise<{
		runId: string;
	}>;
	confirmAction(
		requestId: string,
		approved: boolean,
		options?: {
			mockCredentials?: boolean;
		},
	): Promise<void>;
	cancelRun(threadId: string): Promise<void>;
	getThreadStatus(threadId: string): Promise<ThreadStatus>;
	getThreadMessages(threadId: string): Promise<InstanceAiRichMessagesResponse>;
	listWorkflows(): Promise<WorkflowListItem[]>;
	getWorkflow(id: string): Promise<WorkflowResponse>;
	listExecutions(workflowId?: string): Promise<ExecutionListItem[]>;
	executeWorkflow(
		workflowId: string,
		triggerNodeName?: string,
	): Promise<{
		executionId: string;
	}>;
	getExecution(executionId: string): Promise<ExecutionDetail>;
	updateWorkflow(id: string, updates: Record<string, unknown>): Promise<WorkflowResponse>;
	activateWorkflow(id: string): Promise<void>;
	deactivateWorkflow(id: string): Promise<void>;
	callWebhook(
		path: string,
		method: string,
		body?: Record<string, unknown>,
	): Promise<{
		status: number;
		data: unknown;
	}>;
	deleteWorkflow(id: string): Promise<void>;
	createCredential(
		name: string,
		type: string,
		data: Record<string, unknown>,
	): Promise<{
		id: string;
	}>;
	deleteCredential(id: string): Promise<void>;
	getPersonalProjectId(): Promise<string>;
	listDataTables(projectId: string): Promise<
		Array<{
			id: string;
			name: string;
		}>
	>;
	deleteDataTable(projectId: string, dataTableId: string): Promise<void>;
	executeWithLlmMock(
		workflowId: string,
		scenarioHints?: string,
		timeoutMs?: number,
	): Promise<InstanceAiEvalExecutionResult>;
	getEventsUrl(threadId: string): string;
	get cookie(): string;
	private fetch;
}
export {};
