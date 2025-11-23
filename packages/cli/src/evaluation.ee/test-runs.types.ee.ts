import type { AuthenticatedRequest } from '@n8n/db';

import type { ListQuery } from '@/requests';

export declare namespace TestRunsRequest {
	namespace RouteParams {
		type WorkflowId = {
			workflowId: string;
		};

		type TestRunId = {
			id: string;
		};
	}

	type Create = AuthenticatedRequest<RouteParams.WorkflowId>;

	type GetMany = AuthenticatedRequest<RouteParams.WorkflowId, {}, {}, ListQuery.Params> & {
		listQueryOptions: ListQuery.Options;
	};

	type GetOne = AuthenticatedRequest<RouteParams.WorkflowId & RouteParams.TestRunId>;

	type Delete = AuthenticatedRequest<RouteParams.WorkflowId & RouteParams.TestRunId>;

	type Cancel = AuthenticatedRequest<RouteParams.WorkflowId & RouteParams.TestRunId>;

	type GetCases = AuthenticatedRequest<RouteParams.WorkflowId & RouteParams.TestRunId>;
}
