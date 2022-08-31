/* eslint-disable import/no-cycle */
import express from 'express';
import {
	IConnections,
	ICredentialDataDecryptedObject,
	ICredentialNodeAccess,
	INode,
	INodeCredentialTestRequest,
	IPinData,
	IRunData,
	IWorkflowSettings,
} from 'n8n-workflow';

import type { IExecutionDeleteFilter, IWorkflowDb } from '.';
import type { Role } from './databases/entities/Role';
import type { User } from './databases/entities/User';
import * as UserManagementMailer from './UserManagement/email/UserManagementMailer';
import type { PublicUser } from './UserManagement/Interfaces';

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
	mailer?: UserManagementMailer.UserManagementMailer;
	globalMemberRole?: Role;
};

// ----------------------------------
//           /workflows
// ----------------------------------

export declare namespace WorkflowRequest {
	type RequestBody = Partial<{
		id: string; // delete if sent
		name: string;
		nodes: INode[];
		connections: IConnections;
		settings: IWorkflowSettings;
		active: boolean;
		tags: string[];
	}>;

	type Create = AuthenticatedRequest<{}, {}, RequestBody>;

	type Get = AuthenticatedRequest<{ id: string }>;

	type Delete = Get;

	type Update = AuthenticatedRequest<{ id: string }, {}, RequestBody>;

	type NewName = AuthenticatedRequest<{}, {}, {}, { name?: string }>;

	type GetAll = AuthenticatedRequest<{}, {}, {}, { filter: string }>;

	type GetAllActive = AuthenticatedRequest;

	type GetAllActivationErrors = Get;

	type ManualRun = AuthenticatedRequest<
		{},
		{},
		{
			workflowData: IWorkflowDb;
			runData: IRunData;
			pinData: IPinData;
			startNodes?: string[];
			destinationNode?: string;
		}
	>;
}

// ----------------------------------
//          /credentials
// ----------------------------------

export declare namespace CredentialRequest {
	type CredentialProperties = Partial<{
		id: string; // delete if sent
		name: string;
		type: string;
		nodesAccess: ICredentialNodeAccess[];
		data: ICredentialDataDecryptedObject;
	}>;

	type Create = AuthenticatedRequest<{}, {}, CredentialProperties>;

	type Get = AuthenticatedRequest<{ id: string }, {}, {}, Record<string, string>>;

	type Delete = Get;

	type GetAll = AuthenticatedRequest<{}, {}, {}, { filter: string }>;

	type Update = AuthenticatedRequest<{ id: string }, {}, CredentialProperties>;

	type NewName = WorkflowRequest.NewName;

	type Test = AuthenticatedRequest<{}, {}, INodeCredentialTestRequest>;
}

// ----------------------------------
//           /executions
// ----------------------------------

export declare namespace ExecutionRequest {
	namespace QueryParam {
		type GetAll = {
			filter: string; // '{ waitTill: string; finished: boolean, [other: string]: string }'
			limit: string;
			lastId: string;
			firstId: string;
		};

		type GetAllCurrent = {
			filter: string; // '{ workflowId: string }'
		};
	}

	type GetAll = AuthenticatedRequest<{}, {}, {}, QueryParam.GetAll>;
	type Get = AuthenticatedRequest<{ id: string }, {}, {}, { unflattedResponse: 'true' | 'false' }>;
	type Delete = AuthenticatedRequest<{}, {}, IExecutionDeleteFilter>;
	type Retry = AuthenticatedRequest<{ id: string }, {}, { loadWorkflow: boolean }, {}>;
	type Stop = AuthenticatedRequest<{ id: string }>;
	type GetAllCurrent = AuthenticatedRequest<{}, {}, {}, QueryParam.GetAllCurrent>;
}

// ----------------------------------
//               /me
// ----------------------------------

export declare namespace MeRequest {
	export type Settings = AuthenticatedRequest<
		{},
		{},
		Pick<PublicUser, 'email' | 'firstName' | 'lastName'>
	>;
	export type Password = AuthenticatedRequest<
		{},
		{},
		{ currentPassword: string; newPassword: string }
	>;
	export type SurveyAnswers = AuthenticatedRequest<{}, {}, Record<string, string> | {}>;
}

// ----------------------------------
//             /owner
// ----------------------------------

export declare namespace OwnerRequest {
	type Post = AuthenticatedRequest<
		{},
		{},
		Partial<{
			email: string;
			password: string;
			firstName: string;
			lastName: string;
		}>,
		{}
	>;
}

// ----------------------------------
//     password reset endpoints
// ----------------------------------

export declare namespace PasswordResetRequest {
	export type Email = AuthlessRequest<{}, {}, Pick<PublicUser, 'email'>>;

	export type Credentials = AuthlessRequest<{}, {}, {}, { userId?: string; token?: string }>;

	export type NewPassword = AuthlessRequest<
		{},
		{},
		Pick<PublicUser, 'password'> & { token?: string; userId?: string }
	>;
}

// ----------------------------------
//             /users
// ----------------------------------

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
		{ id: string; email: string; identifier: string },
		{},
		{},
		{ transferId?: string; includeRole: boolean }
	>;

	export type Get = AuthenticatedRequest<
		{ id: string; email: string; identifier: string },
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

// ----------------------------------
//             /login
// ----------------------------------

export type LoginRequest = AuthlessRequest<
	{},
	{},
	{
		email: string;
		password: string;
	}
>;

// ----------------------------------
//          oauth endpoints
// ----------------------------------

export declare namespace OAuthRequest {
	namespace OAuth1Credential {
		type Auth = AuthenticatedRequest<{}, {}, {}, { id: string }>;
		type Callback = AuthenticatedRequest<
			{},
			{},
			{},
			{ oauth_verifier: string; oauth_token: string; cid: string }
		> & {
			user?: User;
		};
	}

	namespace OAuth2Credential {
		type Auth = OAuth1Credential.Auth;
		type Callback = AuthenticatedRequest<{}, {}, {}, { code: string; state: string }>;
	}
}

// ----------------------------------
//      /node-parameter-options
// ----------------------------------

export type NodeParameterOptionsRequest = AuthenticatedRequest<
	{},
	{},
	{},
	{
		nodeTypeAndVersion: string;
		methodName: string;
		path: string;
		currentNodeParameters: string;
		credentials: string;
	}
>;

// ----------------------------------
//             /tags
// ----------------------------------

export declare namespace TagsRequest {
	type Delete = AuthenticatedRequest<{ id: string }>;
}

// ----------------------------------
//             /nodes
// ----------------------------------

export declare namespace NodeRequest {
	type GetAll = AuthenticatedRequest;

	type Post = AuthenticatedRequest<{}, {}, { name?: string }>;

	type Delete = AuthenticatedRequest<{}, {}, {}, { name: string }>;

	type Update = Post;
}
