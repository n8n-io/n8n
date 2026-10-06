import type {
	PublicCreateDestination,
	UpdateOtelSettingsDto,
	TestOtelTraceDto,
	UpdateSamlConfigurationDto,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';

import type { AuthlessRequest } from '@/requests';

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
export declare namespace PackageRequest {
	type Import = AuthenticatedRequest<
		{},
		{},
		{ projectId?: string; folderId?: string },
		Record<string, never>
	>;

	type ImportSelection = AuthenticatedRequest<
		{},
		{},
		{
			selectedProjectId?: string;
			// Multipart text fields carrying JSON-string arrays; parsed by the DTO.
			selectedWorkflowIds?: string;
			deletedWorkflowIds?: string;
			workflowConflictPolicy?: string;
			workflowIdPolicy?: string;
		},
		Record<string, never>
	>;
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

type PaginationBase = { limit: number };

export type PaginationOffsetDecoded = PaginationBase & { offset: number };

export type PaginationCursorDecoded = PaginationBase & { lastId: string };

export type OffsetPagination = PaginationBase & { offset: number; numberOfTotalRecords: number };

export type CursorPagination = PaginationBase & { lastId: string; numberOfNextRecords: number };
export interface IRequired {
	required?: string[];
}
export interface IDependency {
	if?: { properties: {}; required?: string[] };
	then?: { allOf: IRequired[] };
}

export interface IJsonSchema {
	additionalProperties: false;
	type: 'object';
	properties: { [key: string]: { type: string } };
	allOf?: IDependency[];
	required: string[];
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

export declare namespace LogStreamingRequest {
	type GetDestinations = AuthenticatedRequest;
	type GetDestination = AuthenticatedRequest<{ id: string }>;
	type CreateDestination = AuthenticatedRequest<{}, {}, PublicCreateDestination>;
	type UpdateDestination = AuthenticatedRequest<{ id: string }, {}, PublicCreateDestination>;
	type TestDestination = AuthenticatedRequest<{ id: string }>;
	type DeleteDestination = AuthenticatedRequest<{ id: string }>;
}

// ----------------------------------
//        /settings/otel
// ----------------------------------

export declare namespace OtelSettingsRequest {
	type Update = AuthenticatedRequest<{}, {}, UpdateOtelSettingsDto>;
	type Test = AuthenticatedRequest<{}, {}, TestOtelTraceDto>;
}

// ----------------------------------
//        /settings/sso/saml
// ----------------------------------

export declare namespace SsoSamlRequest {
	type Get = AuthenticatedRequest;
	type Update = AuthenticatedRequest<{}, {}, UpdateSamlConfigurationDto>;
}
