import type {
	AnnotationVote,
	ExecutionStatus,
	ExecutionSummary,
	WorkflowExecuteMode,
	IRunExecutionData,
} from 'n8n-workflow';
import type { IWorkflowDb } from '@/Interface';
import type { Scope } from '@n8n/permissions';

export type ExecutionFilterMetadata = {
	key: string;
	value: string;
	exactMatch?: boolean;
};

export type ExecutionFilterVote = AnnotationVote | 'all';

export type ExecutionFilterType = {
	status: string;
	// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
	workflowId: 'all' | string;
	startDate: string | Date;
	endDate: string | Date;
	tags: string[];
	annotationTags: string[];
	vote: ExecutionFilterVote;
	metadata: ExecutionFilterMetadata[];
};

export type ExecutionsQueryFilter = {
	status?: ExecutionStatus[];
	projectId?: string;
	workflowId?: string;
	finished?: boolean;
	waitTill?: boolean;
	metadata?: Array<{ key: string; value: string }>;
	startedAfter?: string;
	startedBefore?: string;
	annotationTags?: string[];
	vote?: ExecutionFilterVote;
};

export interface IExecutionBase {
	id?: string;
	finished: boolean;
	mode: WorkflowExecuteMode;
	status: ExecutionStatus;
	retryOf?: string;
	retrySuccessId?: string;
	startedAt: Date | string;
	createdAt: Date | string;
	stoppedAt?: Date | string;
	workflowId?: string; // To be able to filter executions easily //
}

export interface IExecutionFlatted extends IExecutionBase {
	data: string;
	workflowData: IWorkflowDb;
}

export interface IExecutionFlattedResponse extends IExecutionFlatted {
	id: string;
}

export interface IExecutionPushResponse {
	executionId?: string;
	waitingForWebhook?: boolean;
}

export interface IExecutionResponse extends IExecutionBase {
	id: string;
	data?: IRunExecutionData;
	workflowData: IWorkflowDb;
	executedNode?: string;
	triggerNode?: string;
}

export type ExecutionSummaryWithScopes = ExecutionSummary & { scopes: Scope[] };

export interface IExecutionsListResponse {
	count: number;
	results: ExecutionSummaryWithScopes[];
	estimated: boolean;
	concurrentExecutionsCount: number;
}

export interface IExecutionsCurrentSummaryExtended {
	id: string;
	status: ExecutionStatus;
	mode: WorkflowExecuteMode;
	startedAt: Date;
	workflowId: string;
}

export interface IExecutionsStopData {
	finished?: boolean;
	mode: WorkflowExecuteMode;
	startedAt: Date;
	stoppedAt: Date;
	status: ExecutionStatus;
}

export interface IExecutionDeleteFilter {
	deleteBefore?: Date;
	filters?: ExecutionsQueryFilter;
	ids?: string[];
}

export interface ExecutionPreviewSchemaField {
	name: string;
	type: 'string' | 'number' | 'boolean' | 'object' | 'array';
	fields?: ExecutionPreviewSchemaField[];
	itemSchema?: ExecutionPreviewSchemaField[];
}

export interface ExecutionPreviewOutputSchema {
	itemCount?: number;
	fields: ExecutionPreviewSchemaField[];
}

export interface ExecutionPreviewNodeSchema {
	executionStatus: ExecutionStatus;
	executionTime?: number;
	error?: {
		message: string;
		description?: string;
		name?: string;
		stack?: string;
		node?: { name: string; type: string };
	};
	outputSchema?: ExecutionPreviewOutputSchema;
}
