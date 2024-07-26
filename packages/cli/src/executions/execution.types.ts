import type { ExecutionEntity } from '@/databases/entities/ExecutionEntity';
import type { AuthenticatedRequest } from '@/requests';
import type { ExecutionStatus, IDataObject, WorkflowExecuteMode } from 'n8n-workflow';

export declare namespace ExecutionRequest {
	namespace QueryParams {
		type GetMany = {
			filter: string; // stringified `FilterFields`
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
		rangeQuery: ExecutionSummaries.RangeQuery; // parsed from query params
	};

	type GetOne = AuthenticatedRequest<RouteParams.ExecutionId, {}, {}, QueryParams.GetOne>;

	type Delete = AuthenticatedRequest<{}, {}, BodyParams.DeleteFilter>;

	type Retry = AuthenticatedRequest<RouteParams.ExecutionId, {}, { loadWorkflow: boolean }, {}>;

	type Stop = AuthenticatedRequest<RouteParams.ExecutionId>;
}

export namespace ExecutionSummaries {
	export type Query = RangeQuery | CountQuery;

	export type RangeQuery = { kind: 'range' } & FilterFields &
		AccessFields &
		RangeFields &
		OrderFields;

	export type CountQuery = { kind: 'count' } & FilterFields & AccessFields;

	type FilterFields = Partial<{
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
	}>;

	type AccessFields = {
		accessibleWorkflowIds?: string[];
	};

	type RangeFields = {
		range: {
			limit: number;
			firstId?: string;
			lastId?: string;
		};
	};

	type OrderFields = {
		order?: {
			top?: ExecutionStatus;
			stoppedAt?: 'DESC';
		};
	};
}

export type QueueRecoverySettings = {
	/**
	 * ID of timeout for next scheduled recovery cycle.
	 */
	timeout?: NodeJS.Timeout;

	/**
	 * Number of in-progress executions to check per cycle.
	 */
	batchSize: number;

	/**
	 * Time (in milliseconds) to wait before the next cycle.
	 */
	waitMs: number;
};

export type StopResult = {
	mode: WorkflowExecuteMode;
	startedAt: Date;
	stoppedAt?: Date;
	finished: boolean;
	status: ExecutionStatus;
};
