import type { AuthenticatedRequest } from '@n8n/db';
import type {
	INode,
	IConnections,
	IWorkflowSettings,
	IRunData,
	StartNodeData,
	ITaskData,
	IWorkflowBase,
	AiAgentRequest,
} from 'n8n-workflow';

import type { ListQuery } from '@/requests';

export declare namespace WorkflowRequest {
	type CreateUpdatePayload = Partial<{
		id: string; // deleted if sent
		name: string;
		nodes: INode[];
		connections: IConnections;
		settings: IWorkflowSettings;
		active: boolean;
		tags: string[];
		hash: string;
		meta: Record<string, unknown>;
		projectId: string;
		parentFolderId?: string;
	}>;

	type ManualRunPayload = {
		workflowData: IWorkflowBase;
		runData?: IRunData;
		startNodes?: StartNodeData[];
		destinationNode?: string;
		dirtyNodeNames?: string[];
		triggerToStartFrom?: {
			name: string;
			data?: ITaskData;
		};
		agentRequest?: AiAgentRequest;
	};

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

	type NewName = AuthenticatedRequest<{}, {}, {}, { name?: string }>;

	type ManualRun = AuthenticatedRequest<{ workflowId: string }, {}, ManualRunPayload, {}>;

	type Share = AuthenticatedRequest<{ workflowId: string }, {}, { shareWithIds: string[] }>;
}
