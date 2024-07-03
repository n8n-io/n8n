import type { ExecutionStatus, ICredentialDataDecryptedObject } from 'n8n-workflow';

import type { WorkflowEntity } from '@db/entities/WorkflowEntity';
import type { TagEntity } from '@db/entities/TagEntity';
import type { Risk } from '@/security-audit/types';
import type { AuthlessRequest, AuthenticatedRequest } from '@/requests';

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
			workflowId?: string;
			lastId?: string;
		}
	>;

	type Get = AuthenticatedRequest<{ id: string }, {}, {}, { includeData?: boolean }>;
	type Delete = Get;
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
		}
	>;

	type Create = AuthenticatedRequest<{}, {}, WorkflowEntity, {}>;
	type Get = AuthenticatedRequest<{ id: string }, {}, {}, {}>;
	type Delete = Get;
	type Update = AuthenticatedRequest<{ id: string }, {}, WorkflowEntity, {}>;
	type Activate = Get;
	type GetTags = Get;
	type UpdateTags = AuthenticatedRequest<{ id: string }, {}, TagEntity[]>;
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
	type Create = AuthenticatedRequest<
		{},
		{},
		{ type: string; name: string; data: ICredentialDataDecryptedObject },
		{}
	>;

	type Delete = AuthenticatedRequest<{ id: string }, {}, {}, Record<string, string>>;
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

export class SourceControlPull {
	force?: boolean;

	variables?: { [key: string]: string };
}

export declare namespace PublicSourceControlRequest {
	type Pull = AuthenticatedRequest<{}, {}, SourceControlPull, {}>;
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
