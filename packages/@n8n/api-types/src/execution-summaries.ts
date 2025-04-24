import type { ExecutionStatus } from '@n8n/constants';
import type { Scope } from '@n8n/permissions';
import type { ExecutionSummary } from 'n8n-workflow';

export type AnnotationVote = 'up' | 'down';

export type ListQueryOptions = {
	filter?: Record<string, unknown>;
	select?: Record<string, true>;
	skip?: number;
	take?: number;
	sortBy?: string;
};

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
