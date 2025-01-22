import type {
	INode,
	IConnections,
	IWorkflowSettings,
	IRunData,
	StartNodeData,
	ITaskData,
} from 'n8n-workflow';

import type { IWorkflowDb } from '@/interfaces';
import type { AuthenticatedRequest, ListQuery } from '@/requests';

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
	}>;

	type ManualRunPayload = {
		workflowData: IWorkflowDb;
		runData: IRunData;
		startNodes?: StartNodeData[];
		destinationNode?: string;
		dirtyNodeNames?: string[];
		triggerToStartFrom?: {
			name: string;
			data?: ITaskData;
		};
	};

	type Create = AuthenticatedRequest<{}, {}, CreateUpdatePayload>;

	type Get = AuthenticatedRequest<{ workflowId: string }>;

	type GetMany = AuthenticatedRequest<{}, {}, {}, ListQuery.Params & { includeScopes?: string }> & {
		listQueryOptions: ListQuery.Options;
	};

	type Delete = Get;

	type Update = AuthenticatedRequest<
		{ workflowId: string },
		{},
		CreateUpdatePayload,
		{ forceSave?: string }
	>;

	type NewName = AuthenticatedRequest<{}, {}, {}, { name?: string }>;

	type ManualRun = AuthenticatedRequest<
		{ workflowId: string },
		{},
		ManualRunPayload,
		{ partialExecutionVersion?: string }
	>;

	type Share = AuthenticatedRequest<{ workflowId: string }, {}, { shareWithIds: string[] }>;

	type Transfer = AuthenticatedRequest<
		{ workflowId: string },
		{},
		{ destinationProjectId: string }
	>;
}
