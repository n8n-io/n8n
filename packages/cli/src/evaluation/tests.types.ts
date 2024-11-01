import type { TestEntity } from '@/databases/entities/test-entity';
import type { AuthenticatedRequest, ListQuery } from '@/requests';

// ----------------------------------
//             /tests
// ----------------------------------

export declare namespace TestsRequest {
	namespace RouteParams {
		type TestId = {
			id: TestEntity['id'];
		};
	}

	type GetOne = AuthenticatedRequest<RouteParams.TestId>;

	type GetMany = AuthenticatedRequest<{}, {}, {}, ListQuery.Params & { includeScopes?: string }> & {
		listQueryOptions: ListQuery.Options;
	};

	type Create = AuthenticatedRequest<{}, {}, { name: string; workflowId: string }>;

	type Update = AuthenticatedRequest<
		RouteParams.TestId,
		{},
		{ name?: string; evaluationWorkflowId?: string; annotationTagId?: string }
	>;

	type Delete = AuthenticatedRequest<RouteParams.TestId>;
}
