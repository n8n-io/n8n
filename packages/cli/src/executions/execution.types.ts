import type { AuthenticatedRequest, ExecutionSummaries, ExecutionEntity } from '@n8n/db';
import type {
	AnnotationVote,
	ExecutionStatus,
	IDataObject,
	WorkflowExecuteMode,
} from 'n8n-workflow';

export declare namespace ExecutionRequest {
	namespace QueryParams {
		type GetMany = {
			filter: string; // stringified `FilterFields`
			limit: string;
			lastId: string;
			firstId: string;
		};

		type GetOne = { unflattedResponse: 'true' | 'false' };

		type GetFullContext = {
			includePerformanceMetrics?: 'true' | 'false';
			includeExecutionData?: 'true' | 'false';
			includeWorkflowContext?: 'true' | 'false';
		};
	}

	namespace BodyParams {
		type DeleteFilter = {
			deleteBefore?: Date;
			filters?: IDataObject;
			ids?: string[];
		};

		type Cancel = {
			force?: boolean;
			reason?: string;
			timeout?: number;
		};

		type RetryAdvanced = {
			fromNodeName?: string;
			modifiedParameters?: IDataObject;
			retryFromStart?: boolean;
			skipFailedNodes?: boolean;
		};

		type BulkCancel = {
			executionIds: string[];
			force?: boolean;
			reason?: string;
			timeout?: number;
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

	type GetMany = AuthenticatedRequest<object, object, object, QueryParams.GetMany> & {
		rangeQuery: ExecutionSummaries.RangeQuery; // parsed from query params
	};

	type GetOne = AuthenticatedRequest<RouteParams.ExecutionId, object, object, QueryParams.GetOne>;

	type Delete = AuthenticatedRequest<object, object, BodyParams.DeleteFilter>;

	type Retry = AuthenticatedRequest<
		RouteParams.ExecutionId,
		object,
		{ loadWorkflow: boolean },
		object
	>;

	type Stop = AuthenticatedRequest<RouteParams.ExecutionId>;

	type Update = AuthenticatedRequest<
		RouteParams.ExecutionId,
		object,
		ExecutionUpdatePayload,
		object
	>;

	// Advanced Execution Control Types
	type Cancel = AuthenticatedRequest<RouteParams.ExecutionId, object, BodyParams.Cancel>;

	type RetryAdvanced = AuthenticatedRequest<
		RouteParams.ExecutionId,
		object,
		BodyParams.RetryAdvanced
	>;

	type GetFullContext = AuthenticatedRequest<
		RouteParams.ExecutionId,
		object,
		object,
		QueryParams.GetFullContext
	>;

	type GetProgress = AuthenticatedRequest<RouteParams.ExecutionId>;

	type BulkCancel = AuthenticatedRequest<object, object, BodyParams.BulkCancel>;
}

export type StopResult = {
	mode: WorkflowExecuteMode;
	startedAt: Date;
	stoppedAt?: Date;
	finished: boolean;
	status: ExecutionStatus;
};

export type CancelResult = {
	executionId: string;
	status: ExecutionStatus;
	cancelled: boolean;
	force: boolean;
	reason?: string;
	cancelledAt: Date;
};

export type RetryAdvancedResult = {
	newExecutionId: string;
	originalExecutionId: string;
	fromNodeName?: string;
	startedAt: Date;
	mode: WorkflowExecuteMode;
};

export type ExecutionProgress = {
	executionId: string;
	status: ExecutionStatus;
	finished: boolean;
	progress: {
		percent: number;
		completedNodes: number;
		totalNodes: number;
		currentNodeName?: string;
		runningNodes?: string[];
		failedNodes?: string[];
	};
	startedAt: Date;
	stoppedAt?: Date;
	estimatedTimeRemaining?: number;
};

export type ExecutionFullContext = {
	executionId: string;
	execution: ExecutionEntity;
	performanceMetrics?: {
		totalExecutionTime: number;
		nodeExecutionTimes: Record<string, number>;
		memoryUsage?: {
			peak: number;
			average: number;
		};
		cpuUsage?: {
			peak: number;
			average: number;
		};
	};
	executionData?: IDataObject;
	workflowContext?: {
		variables: IDataObject;
		expressions: string[];
		connections: IDataObject;
	};
};

export type BulkCancelResult = {
	successCount: number;
	errorCount: number;
	results: Array<{
		executionId: string;
		success: boolean;
		error?: string;
		cancelledAt?: Date;
	}>;
};
