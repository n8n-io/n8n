import type { AuthenticatedRequest } from '@n8n/db';
import type {
	INode,
	IConnections,
	IWorkflowSettings,
	IRunData,
	ITaskData,
	IWorkflowBase,
	AiAgentRequest,
} from 'n8n-workflow';

import type { ListQuery } from '@/requests';

export declare namespace WorkflowRequest {
	type CreateUpdatePayload = Partial<{
		id: string; // deleted if sent
		name: string;
		description: string | null;
		nodes: INode[];
		connections: IConnections;
		settings: IWorkflowSettings;
		active: boolean;
		tags: string[];
		hash: string;
		meta: Record<string, unknown>;
		projectId: string;
		parentFolderId?: string;
		uiContext?: string;
	}>;

	// 1. Full Manual Execution from Trigger
	type FullManualExecutionFromTriggerPayload = {
		workflowData: IWorkflowBase;
		triggerToStartFrom?: { name: string; data?: ITaskData };
		agentRequest?: AiAgentRequest;
	};
	// 2. Full Manual Execution to Destination
	type FullManualExecutionToDestinationPayload = {
		workflowData: IWorkflowBase;
		destinationNode: string;
		agentRequest?: AiAgentRequest;
	};

	// There could also be an edge case for the chat node where the triggerToStartFrom with data and the destinationNode exists.

	// 3. Partial Manual Execution to Destination
	type PartialManualExecutionToDestination = {
		workflowData: IWorkflowBase;
		runData: IRunData;
		destinationNode: string;
		dirtyNodeNames: string[];
		agentRequest?: AiAgentRequest;
	};

	type ManualRunPayload =
		| FullManualExecutionFromTriggerPayload
		| FullManualExecutionToDestinationPayload
		| PartialManualExecutionToDestination;

	type Create = AuthenticatedRequest<{}, {}, CreateUpdatePayload>;

	type Get = AuthenticatedRequest<{ workflowId: string }>;

	type GetMany = AuthenticatedRequest<
		{},
		{},
		{},
		ListQuery.Params & {
			includeScopes?: string;
			includeFolders?: string;
			onlySharedWithMe?: string;
			availableInMCP?: string;
		}
	> & {
		listQueryOptions: ListQuery.Options;
	};

	type Update = AuthenticatedRequest<
		{ workflowId: string },
		{},
		CreateUpdatePayload,
		{ forceSave?: string }
	>;

	type NewName = AuthenticatedRequest<{}, {}, {}, { name?: string; projectId: string }>;

	type ManualRun = AuthenticatedRequest<{ workflowId: string }, {}, ManualRunPayload, {}>;

	type Share = AuthenticatedRequest<{ workflowId: string }, {}, { shareWithIds: string[] }>;

	type Activate = AuthenticatedRequest<
		{ workflowId: string },
		{},
		{ versionId: string; name?: string; description?: string }
	>;

	type Deactivate = AuthenticatedRequest<{ workflowId: string }>;
}
