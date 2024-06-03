import type { IWorkflowDb } from '@/Interfaces';
import type { AuthenticatedRequest, ListQuery } from '@/requests';
import type {
	INode,
	IConnections,
	IWorkflowSettings,
	IRunData,
	IPinData,
	StartNodeData,
} from 'n8n-workflow';

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
		pinData: IPinData;
		startNodes?: StartNodeData[];
		destinationNode?: string;
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

	type ManualRun = AuthenticatedRequest<{ workflowId: string }, {}, ManualRunPayload>;

	type Share = AuthenticatedRequest<{ workflowId: string }, {}, { shareWithIds: string[] }>;

	type Transfer = AuthenticatedRequest<
		{ workflowId: string },
		{},
		{ destinationProjectId: string }
	>;

	type FromUrl = AuthenticatedRequest<{}, {}, {}, { url?: string }>;
}
