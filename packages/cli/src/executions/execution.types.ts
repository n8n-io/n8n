import type { ExecutionEntity } from '@/databases/entities/ExecutionEntity';
import type { AuthenticatedRequest } from '@/requests';
import type { ExecutionStatus, IDataObject } from 'n8n-workflow';

export declare namespace ExecutionRequest {
	namespace QueryParams {
		type GetMany = {
			filter: string; // '{ waitTill: string; finished: boolean, [other: string]: string }'
			limit: string;
			lastId: string;
			firstId: string;
		};

		type GetOne = { unflattedResponse: 'true' | 'false' };
	}

	namespace BodyParams {
		type DeleteFilter = {
			deleteBefore?: Date;
			filters?: IDataObject;
			ids?: string[];
		};
	}

	namespace RouteParams {
		type ExecutionId = {
			id: ExecutionEntity['id'];
		};
	}

	type GetMany = AuthenticatedRequest<{}, {}, {}, QueryParams.GetMany> & {
		getManyQuery: GetManyQuery; // once parsed from query params
	};

	type GetOne = AuthenticatedRequest<RouteParams.ExecutionId, {}, {}, QueryParams.GetOne>;

	type Delete = AuthenticatedRequest<{}, {}, BodyParams.DeleteFilter>;

	type Retry = AuthenticatedRequest<RouteParams.ExecutionId, {}, { loadWorkflow: boolean }, {}>;

	type Stop = AuthenticatedRequest<RouteParams.ExecutionId>;

	type GetManyActive = AuthenticatedRequest<{}, {}, {}, { filter?: string }>;
}

export type GetManyActiveFilter = {
	workflowId?: string;
	status?: ExecutionStatus;
	finished?: boolean;
};

export type GetManyQuery = Partial<{
	id: string;
	finished: boolean;
	mode: string;
	retryOf: string;
	retrySuccessId: string;
	status: ExecutionStatus[];
	workflowId: string;
	waitTill: boolean;
	metadata: Array<{ key: string; value: string }>;
	startedAfter: string;
	startedBefore: string;
	limit: number;
	firstId: string;
	lastId: string;
	accessibleWorkflowIds: string[];
}>;
