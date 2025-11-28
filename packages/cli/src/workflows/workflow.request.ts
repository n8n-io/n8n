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

	// TODO: Use a discriminator when CAT-1809 lands
	//
	// 1. Full Manual Execution from Known Trigger
	type FullManualExecutionFromKnownTriggerPayload = {
		workflowData: IWorkflowBase;
		agentRequest?: AiAgentRequest;

		destinationNode?: string;
		triggerToStartFrom: { name: string; data?: ITaskData };
	};
	// 2. Full Manual Execution from Unknown Trigger
	type FullManualExecutionFromUnknownTriggerPayload = {
		workflowData: IWorkflowBase;
		agentRequest?: AiAgentRequest;

		destinationNode: string;
	};

	// 3. Partial Manual Execution to Destination
	type PartialManualExecutionToDestinationPayload = {
		workflowData: IWorkflowBase;
		agentRequest?: AiAgentRequest;

		runData: IRunData;
		destinationNode: string;
		dirtyNodeNames: string[];
	};

	type ManualRunPayload =
		| FullManualExecutionFromKnownTriggerPayload
		| FullManualExecutionFromUnknownTriggerPayload
		| PartialManualExecutionToDestinationPayload;

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
