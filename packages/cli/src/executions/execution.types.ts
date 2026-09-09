import type { AuthenticatedRequest, ExecutionSummaries, ExecutionEntity } from '@n8n/db';
import type { AnnotationVote, ExecutionStatus, WorkflowExecuteMode } from 'n8n-workflow';

export declare namespace ExecutionRequest {
	namespace QueryParams {
		type GetMany = {
			filter: string; // stringified `FilterFields`
			limit: string;
			lastId: string;
			firstId: string;
		};
	}

	namespace BodyParams {
		type StopMany = {
			filter: ExecutionSummaries.StopExecutionFilterQuery; // stringified `FilterFields`
		};
	}

	namespace RouteParams {
		type ExecutionId = {
			id: ExecutionEntity['id'];
		};
	}

	type ExecutionUpdatePayload = {
		tags?: string[];
		vote?: AnnotationVote | null;
	};

	type GetMany = AuthenticatedRequest<{}, {}, {}, QueryParams.GetMany> & {
		rangeQuery: ExecutionSummaries.RangeQuery; // parsed from query params
	};

	type GetOne = AuthenticatedRequest<RouteParams.ExecutionId>;

	type GetVersions = AuthenticatedRequest<{ workflowId: string }>;

	type Retry = AuthenticatedRequest<RouteParams.ExecutionId, {}, { loadWorkflow?: boolean }, {}>;

	type Stop = AuthenticatedRequest<RouteParams.ExecutionId>;
	type StopMany = AuthenticatedRequest<{}, {}, BodyParams.StopMany>;

	type Update = AuthenticatedRequest<RouteParams.ExecutionId, {}, ExecutionUpdatePayload, {}>;
}

export type StopResult = {
	mode: WorkflowExecuteMode;
	startedAt: Date;
	stoppedAt?: Date;
	finished: boolean;
	status: ExecutionStatus;
};
