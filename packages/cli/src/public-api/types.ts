import type {
	AddDataTableColumnDto,
	AddDataTableRowsDto,
	PublicApiCreateDataTableDto,
	UpdateDataTableDto,
	UpdateDataTableColumnDto,
	UpdateDataTableRowDto,
	UpsertDataTableRowDto,
} from '@n8n/api-types';
import type { AuthenticatedRequest, TagEntity, WorkflowEntity } from '@n8n/db';
import type { ExecutionStatus, ICredentialDataDecryptedObject } from 'n8n-workflow';

import type { AuthlessRequest } from '@/requests';
import type { Risk } from '@/security-audit/types';

export type PaginatedRequest = AuthenticatedRequest<
	{},
	{},
	{},
	{
		limit?: number;
		cursor?: string;
		offset?: number;
		lastId?: string;
	}
>;
export declare namespace ExecutionRequest {
	type GetAll = AuthenticatedRequest<
		{},
		{},
		{},
		{
			status?: ExecutionStatus;
			limit?: number;
			cursor?: string;
			offset?: number;
			includeData?: boolean;
			redactExecutionData?: boolean;
			workflowId?: string;
			lastId?: string;
			projectId?: string;
		}
	>;

	type Get = AuthenticatedRequest<
		{ id: string },
		{},
		{},
		{ includeData?: boolean; redactExecutionData?: boolean }
	>;
	type Delete = Get;
	type Retry = AuthenticatedRequest<{ id: string }, {}, { loadWorkflow?: boolean }, {}>;
	type Stop = AuthenticatedRequest<{ id: string }>;
	type StopMany = AuthenticatedRequest<
		{},
		{},
		{
			status: Array<Extract<ExecutionStatus, 'waiting' | 'running'> | 'queued'>;
			workflowId?: string;
			startedAfter?: string;
			startedBefore?: string;
		}
	>;
	type GetTags = AuthenticatedRequest<{ id: string }>;
	type UpdateTags = AuthenticatedRequest<{ id: string }, {}, Array<{ id: string }>>;
}

export declare namespace TagRequest {
	type GetAll = AuthenticatedRequest<
		{},
		{},
		{},
		{
			limit?: number;
			cursor?: string;
			offset?: number;
		}
	>;

	type Create = AuthenticatedRequest<{}, {}, TagEntity>;
	type Get = AuthenticatedRequest<{ id: string }>;
	type Delete = Get;
	type Update = AuthenticatedRequest<{ id: string }, {}, TagEntity>;
}

export declare namespace CredentialTypeRequest {
	type Get = AuthenticatedRequest<{ credentialTypeName: string }, {}, {}, {}>;
}

export declare namespace WorkflowRequest {
	type GetAll = AuthenticatedRequest<
		{},
		{},
		{},
		{
			tags?: string;
			status?: ExecutionStatus;
			limit?: number;
			cursor?: string;
			offset?: number;
			workflowId?: number;
			active: boolean;
			name?: string;
			projectId?: string;
			excludePinnedData?: boolean;
		}
	>;

	type Create = AuthenticatedRequest<{}, {}, WorkflowEntity & { projectId?: string }, {}>;
	type Get = AuthenticatedRequest<{ id: string }, {}, {}, { excludePinnedData?: boolean }>;
	type Delete = Get;
	type Update = AuthenticatedRequest<{ id: string }, {}, WorkflowEntity, {}>;
	type Activate = AuthenticatedRequest<
		{ id: string },
		{},
		{ versionId?: string; name?: string; description?: string },
		{}
	>;
	type GetTags = Get;
	type UpdateTags = AuthenticatedRequest<{ id: string }, {}, TagEntity[]>;
	type Transfer = AuthenticatedRequest<{ id: string }, {}, { destinationProjectId: string }>;
	type GetVersion = AuthenticatedRequest<{ id: string; versionId: string }, {}, {}, {}>;
}

export declare namespace UserRequest {
	export type Invite = AuthenticatedRequest<{}, {}, Array<{ email: string }>>;

	export type ResolveSignUp = AuthlessRequest<
		{},
		{},
		{},
		{ inviterId?: string; inviteeId?: string }
	>;

	export type SignUp = AuthenticatedRequest<
		{ id: string },
		{ inviterId?: string; inviteeId?: string }
	>;

	export type Delete = AuthenticatedRequest<
		{ id: string; email: string },
		{},
		{},
		{ transferId?: string; includeRole: boolean }
	>;

	export type Get = AuthenticatedRequest<
		{ id: string; email: string },
		{},
		{},
		{ limit?: number; offset?: number; cursor?: string; includeRole?: boolean }
	>;

	export type Reinvite = AuthenticatedRequest<{ id: string }>;

	export type Update = AuthlessRequest<
		{ id: string },
		{},
		{
			inviterId: string;
			firstName: string;
			lastName: string;
			password: string;
		}
	>;
}

export declare namespace CredentialRequest {
	type GetAll = AuthenticatedRequest<
		{},
		{},
		{},
		{ limit?: number; cursor?: string; offset?: number }
	>;

	type Get = AuthenticatedRequest<{ id: string }>;

	type Create = AuthenticatedRequest<
		{},
		{},
		{ type: string; name: string; data: ICredentialDataDecryptedObject; projectId?: string },
		{}
	>;

	type Update = AuthenticatedRequest<
		{ id: string },
		{},
		{
			type?: string;
			name?: string;
			data?: ICredentialDataDecryptedObject;
			isGlobal?: boolean;
			isResolvable?: boolean;
			isPartialData?: boolean;
		},
		{}
	>;

	type Test = AuthenticatedRequest<{ id: string }, {}, {}, {}>;

	type Delete = AuthenticatedRequest<{ id: string }, {}, {}, Record<string, string>>;

	type Transfer = AuthenticatedRequest<{ id: string }, {}, { destinationProjectId: string }>;
}

export declare namespace InsightsRequest {
	type GetSummary = AuthenticatedRequest<
		{},
		{},
		{},
		{
			startDate?: string;
			endDate?: string;
			projectId?: string;
		}
	>;
}

export type OperationID = 'getUsers' | 'getUser';

type PaginationBase = { limit: number };

export type PaginationOffsetDecoded = PaginationBase & { offset: number };

export type PaginationCursorDecoded = PaginationBase & { lastId: string };

export type OffsetPagination = PaginationBase & { offset: number; numberOfTotalRecords: number };

export type CursorPagination = PaginationBase & { lastId: string; numberOfNextRecords: number };
export interface IRequired {
	required?: string[];
	not?: { required?: string[] };
}
export interface IDependency {
	if?: { properties: {} };
	then?: { allOf: IRequired[] };
	else?: { allOf: IRequired[] };
}

export interface IJsonSchema {
	additionalProperties: boolean;
	type: 'object';
	properties: { [key: string]: { type: string } };
	allOf?: IDependency[];
	required: string[];
}

// ----------------------------------
//           /data-tables
// ----------------------------------

export declare namespace DataTableRequest {
	type List = AuthenticatedRequest<
		{},
		{},
		{},
		{
			limit?: number;
			cursor?: string;
			offset?: number;
			filter?: string;
			sortBy?: string;
		}
	>;

	type Create = AuthenticatedRequest<{}, {}, PublicApiCreateDataTableDto, {}>;

	type Get = AuthenticatedRequest<{ dataTableId: string }, {}, {}, {}>;

	type Update = AuthenticatedRequest<{ dataTableId: string }, {}, UpdateDataTableDto, {}>;

	type Delete = AuthenticatedRequest<{ dataTableId: string }, {}, {}, {}>;

	type GetRows = AuthenticatedRequest<
		{ dataTableId: string },
		{},
		{},
		{
			limit?: number;
			cursor?: string;
			offset?: number;
			filter?: string;
			sortBy?: string;
			search?: string;
		}
	>;

	type InsertRows = AuthenticatedRequest<{ dataTableId: string }, {}, AddDataTableRowsDto, {}>;

	type UpdateRows = AuthenticatedRequest<{ dataTableId: string }, {}, UpdateDataTableRowDto, {}>;

	type UpsertRow = AuthenticatedRequest<{ dataTableId: string }, {}, UpsertDataTableRowDto, {}>;

	type DeleteRows = AuthenticatedRequest<
		{ dataTableId: string },
		{},
		{},
		{
			filter?: string;
			returnData?: string | boolean;
			dryRun?: string | boolean;
		}
	>;

	type ListColumns = AuthenticatedRequest<{ dataTableId: string }, {}, {}, {}>;

	type CreateColumn = AuthenticatedRequest<{ dataTableId: string }, {}, AddDataTableColumnDto, {}>;

	type DeleteColumn = AuthenticatedRequest<{ dataTableId: string; columnId: string }, {}, {}, {}>;

	type UpdateColumn = AuthenticatedRequest<
		{ dataTableId: string; columnId: string },
		{},
		UpdateDataTableColumnDto,
		{}
	>;
}

// ----------------------------------
//           /community-packages
// ----------------------------------

export declare namespace CommunityPackageRequest {
	type Install = AuthenticatedRequest<{}, {}, { name: string; version?: string }>;
	type List = AuthenticatedRequest;
	type Update = AuthenticatedRequest<{ name: string }, {}, { version?: string }>;
	type Uninstall = AuthenticatedRequest<{ name: string }>;
}

// ----------------------------------
//           /audit
// ----------------------------------

export declare namespace AuditRequest {
	type Generate = AuthenticatedRequest<
		{},
		{},
		{ additionalOptions?: { categories?: Risk.Category[]; daysAbandonedWorkflow?: number } }
	>;
}
