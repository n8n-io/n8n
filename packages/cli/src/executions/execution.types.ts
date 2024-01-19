import type { AuthenticatedRequest } from '@/requests';
import type { ExecutionStatus, IDataObject } from 'n8n-workflow';

export declare namespace ExecutionRequest {
	namespace QueryParam {
		type GetAll = {
			filter: string; // '{ waitTill: string; finished: boolean, [other: string]: string }'
			limit: string;
			lastId: string;
			firstId: string;
		};
	}

	interface DeleteFilter {
		deleteBefore?: Date;
		filters?: IDataObject;
		ids?: string[];
	}

	type GetAll = AuthenticatedRequest<{}, {}, {}, QueryParam.GetAll>;

	type Get = AuthenticatedRequest<{ id: string }, {}, {}, { unflattedResponse: 'true' | 'false' }>;

	type Delete = AuthenticatedRequest<{}, {}, DeleteFilter>;

	type Retry = AuthenticatedRequest<{ id: string }, {}, { loadWorkflow: boolean }, {}>;

	type Stop = AuthenticatedRequest<{ id: string }>;

	type GetAllActive = AuthenticatedRequest<{}, {}, {}, { filter?: string }>;
}

export type GetAllActiveFilter = {
	workflowId?: string;
	status?: ExecutionStatus;
	finished?: boolean;
};
