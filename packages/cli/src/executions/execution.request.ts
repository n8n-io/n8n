import type { IExecutionDeleteFilter } from '@/Interfaces';
import type { AuthenticatedRequest } from '@/requests';
import type { ExecutionStatus } from 'n8n-workflow';

export declare namespace ExecutionRequest {
	namespace QueryParam {
		type GetAll = {
			filter: string; // '{ waitTill: string; finished: boolean, [other: string]: string }'
			limit: string;
			lastId: string;
			firstId: string;
		};

		type GetAllCurrent = {
			filter: string; // '{ workflowId: string }'
		};
	}

	type GetAll = AuthenticatedRequest<{}, {}, {}, QueryParam.GetAll>;

	type Get = AuthenticatedRequest<{ id: string }, {}, {}, { unflattedResponse: 'true' | 'false' }>;

	type Delete = AuthenticatedRequest<{}, {}, IExecutionDeleteFilter>;

	type Retry = AuthenticatedRequest<{ id: string }, {}, { loadWorkflow: boolean }, {}>;

	type Stop = AuthenticatedRequest<{ id: string }>;

	type GetAllCurrent = AuthenticatedRequest<{}, {}, {}, QueryParam.GetAllCurrent>;
}

export type ActiveExecutionsQueryFilter = {
	workflowId?: string;

	status?: ExecutionStatus;

	finished?: boolean;
};
