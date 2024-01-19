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

		type Get = { unflattedResponse: 'true' | 'false' };
	}

	namespace BodyParams {
		type DeleteFilter = {
			deleteBefore?: Date;
			filters?: IDataObject;
			ids?: string[];
		};
	}

	type GetMany = AuthenticatedRequest<{}, {}, {}, QueryParams.GetMany>;

	type Get = AuthenticatedRequest<{ id: ExecutionEntity['id'] }, {}, {}, QueryParams.Get>;

	type Delete = AuthenticatedRequest<{}, {}, BodyParams.DeleteFilter>;

	type Retry = AuthenticatedRequest<
		{ id: ExecutionEntity['id'] },
		{},
		{ loadWorkflow: boolean },
		{}
	>;

	type Stop = AuthenticatedRequest<{ id: ExecutionEntity['id'] }>;

	type GetAllActive = AuthenticatedRequest<{}, {}, {}, { filter?: string }>;
}

export type GetAllActiveFilter = {
	workflowId?: string;
	status?: ExecutionStatus;
	finished?: boolean;
};
