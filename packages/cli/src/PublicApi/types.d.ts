/* eslint-disable import/no-cycle */
import express from 'express';
import { IDataObject } from 'n8n-workflow';

import type { User } from '../databases/entities/User';

import type { Role } from '../databases/entities/Role';

import type { WorkflowEntity } from '../databases/entities/WorkflowEntity';

import * as UserManagementMailer from '../UserManagement/email/UserManagementMailer';

export type ExecutionStatus = 'error' | 'running' | 'success' | 'waiting' | null;

export type AuthlessRequest<
	RouteParams = {},
	ResponseBody = {},
	RequestBody = {},
	RequestQuery = {},
> = express.Request<RouteParams, ResponseBody, RequestBody, RequestQuery>;

export type AuthenticatedRequest<
	RouteParams = {},
	ResponseBody = {},
	RequestBody = {},
	RequestQuery = {},
> = express.Request<RouteParams, ResponseBody, RequestBody, RequestQuery> & {
	user: User;
	globalMemberRole?: Role;
	mailer?: UserManagementMailer.UserManagementMailer;
};

export type PaginatatedRequest = AuthenticatedRequest<
	{},
	{},
	{},
	{
		limit?: number;
		cursor?: string;
		offset?: number;
		lastId?: number;
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
			workflowId?: number;
			lastId?: number;
		}
	>;

	type Get = AuthenticatedRequest<{ id: number }, {}, {}, { includeData?: boolean }>;
	type Delete = Get;
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
		}
	>;

	type Create = AuthenticatedRequest<{}, {}, WorkflowEntity, {}>;
	type Get = AuthenticatedRequest<{ id: number }, {}, {}, {}>;
	type Delete = Get;
	type Update = AuthenticatedRequest<{ id: number }, {}, WorkflowEntity, {}>;
	type Activate = Get;
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
	type Create = AuthenticatedRequest<{}, {}, { type: string; name: string; data: IDataObject }, {}>;
}

export type OperationID = 'getUsers' | 'getUser';

type PaginationBase = { limit: number };

type PaginationOffsetDecoded = PaginationBase & { offset: number };

type PaginationCursorDecoded = PaginationBase & { lastId: number };

type OffsetPagination = PaginationBase & { offset: number; numberOfTotalRecords: number };

type CursorPagination = PaginationBase & { lastId: number; numberOfNextRecords: number };
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
