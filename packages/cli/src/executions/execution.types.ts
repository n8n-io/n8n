import type { Scope } from '@n8n/permissions';
import type {
	AnnotationVote,
	ExecutionStatus,
	ExecutionSummary,
	IDataObject,
	WorkflowExecuteMode,
} from 'n8n-workflow';

import type { ExecutionEntity } from '@/databases/entities/execution-entity';
import type { AuthenticatedRequest } from '@/requests';

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

	type ExecutionUpdatePayload = {
		tags?: string[];
		vote?: AnnotationVote | null;
	};

	type GetMany = AuthenticatedRequest<{}, {}, {}, QueryParams.GetMany> & {
		rangeQuery: ExecutionSummaries.RangeQuery; // parsed from query params
	};

	type GetOne = AuthenticatedRequest<RouteParams.ExecutionId, {}, {}, QueryParams.GetOne>;

	type Delete = AuthenticatedRequest<{}, {}, BodyParams.DeleteFilter>;

	type Retry = AuthenticatedRequest<RouteParams.ExecutionId, {}, { loadWorkflow: boolean }, {}>;

	type Stop = AuthenticatedRequest<RouteParams.ExecutionId>;

	type Update = AuthenticatedRequest<RouteParams.ExecutionId, {}, ExecutionUpdatePayload, {}>;
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
		annotationTags: string[]; // tag IDs
		vote: AnnotationVote;
		projectId: string;
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
			startedAt?: 'DESC';
		};
	};

	export type ExecutionSummaryWithScopes = ExecutionSummary & { scopes: Scope[] };
}

export type StopResult = {
	mode: WorkflowExecuteMode;
	startedAt: Date;
	stoppedAt?: Date;
	finished: boolean;
	status: ExecutionStatus;
};
