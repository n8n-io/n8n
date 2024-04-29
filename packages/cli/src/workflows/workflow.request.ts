import type { IWorkflowDb } from '@/Interfaces';
import type { AuthenticatedRequest } from '@/requests';
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
		id: string; // delete if sent
		name: string;
		nodes: INode[];
		connections: IConnections;
		settings: IWorkflowSettings;
		active: boolean;
		tags: string[];
		hash: string;
		meta: Record<string, unknown>;
	}>;

	type ManualRunPayload = {
		workflowData: IWorkflowDb;
		runData: IRunData;
		pinData: IPinData;
		startNodes?: StartNodeData[];
		destinationNode?: string;
	};

	type Create = AuthenticatedRequest<{}, {}, CreateUpdatePayload>;

	type Get = AuthenticatedRequest<{ id: string }>;

	type Delete = Get;

	type Update = AuthenticatedRequest<
		{ id: string },
		{},
		CreateUpdatePayload,
		{ forceSave?: string }
	>;

	type NewName = AuthenticatedRequest<{}, {}, {}, { name?: string }>;

	type ManualRun = AuthenticatedRequest<{}, {}, ManualRunPayload>;

	type Share = AuthenticatedRequest<{ workflowId: string }, {}, { shareWithIds: string[] }>;

	type FromUrl = AuthenticatedRequest<{}, {}, {}, { url?: string }>;
}
