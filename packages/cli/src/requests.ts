import type express from 'express';
import type {
	BannerName,
	IConnections,
	ICredentialDataDecryptedObject,
	ICredentialNodeAccess,
	IDataObject,
	INode,
	INodeCredentialTestRequest,
	IPinData,
	IRunData,
	IUser,
	IWorkflowSettings,
} from 'n8n-workflow';

import { IsBoolean, IsEmail, IsOptional, IsString, Length } from 'class-validator';
import { NoXss } from '@db/utils/customValidators';
import type {
	PublicUser,
	IExecutionDeleteFilter,
	IWorkflowDb,
	SecretsProvider,
	SecretsProviderState,
} from '@/Interfaces';
import type { Role } from '@db/entities/Role';
import type { User } from '@db/entities/User';
import type { UserManagementMailer } from '@/UserManagement/email';
import type { Variables } from '@db/entities/Variables';
import type { WorkflowEntity } from './databases/entities/WorkflowEntity';
import type { CredentialsEntity } from './databases/entities/CredentialsEntity';

export class UserUpdatePayload implements Pick<User, 'email' | 'firstName' | 'lastName'> {
	@IsEmail()
	email: string;

	@NoXss()
	@IsString({ message: 'First name must be of type string.' })
	@Length(1, 32, { message: 'First name must be $constraint1 to $constraint2 characters long.' })
	firstName: string;

	@NoXss()
	@IsString({ message: 'Last name must be of type string.' })
	@Length(1, 32, { message: 'Last name must be $constraint1 to $constraint2 characters long.' })
	lastName: string;
}
export class UserSettingsUpdatePayload {
	@IsBoolean({ message: 'userActivated should be a boolean' })
	@IsOptional()
	userActivated: boolean;

	@IsBoolean({ message: 'allowSSOManualLogin should be a boolean' })
	@IsOptional()
	allowSSOManualLogin?: boolean;
}

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
> = Omit<express.Request<RouteParams, ResponseBody, RequestBody, RequestQuery>, 'user'> & {
	user: User;
	mailer?: UserManagementMailer;
	globalMemberRole?: Role;
};

// ----------------------------------
//           /workflows
// ----------------------------------

export declare namespace WorkflowRequest {
	type CreateUpdatePayload = Partial<{
		id: string; // delete if sent
		name: string;
		nodes: INode[];
		connections: IConnections;
		settings: IWorkflowSettings;
		active: boolean;
		tags: string[];
		hash: string;
	}>;

	type ManualRunPayload = {
		workflowData: IWorkflowDb;
		runData: IRunData;
		pinData: IPinData;
		startNodes?: string[];
		destinationNode?: string;
	};

	type Create = AuthenticatedRequest<{}, {}, CreateUpdatePayload>;

	type Get = AuthenticatedRequest<{ id: string }>;

	type Delete = Get;

	type Update = AuthenticatedRequest<
		{ id: string },
		{},
		CreateUpdatePayload,
		{ forceSave?: string }
	>;

	type NewName = AuthenticatedRequest<{}, {}, {}, { name?: string }>;

	type GetAllActive = AuthenticatedRequest;

	type GetAllActivationErrors = Get;

	type ManualRun = AuthenticatedRequest<{}, {}, ManualRunPayload>;

	type Share = AuthenticatedRequest<{ workflowId: string }, {}, { shareWithIds: string[] }>;
}

// ----------------------------------
//            list query
// ----------------------------------

export namespace ListQuery {
	export type Request = AuthenticatedRequest<{}, {}, {}, Params> & {
		listQueryOptions?: Options;
	};

	export type Params = {
		filter?: string;
		skip?: string;
		take?: string;
		select?: string;
	};

	export type Options = {
		filter?: Record<string, unknown>;
		select?: Record<string, true>;
		skip?: number;
		take?: number;
	};

	/**
	 * Slim workflow returned from a list query operation.
	 */
	export namespace Workflow {
		type OptionalBaseFields = 'name' | 'active' | 'versionId' | 'createdAt' | 'updatedAt' | 'tags';

		type BaseFields = Pick<WorkflowEntity, 'id'> &
			Partial<Pick<WorkflowEntity, OptionalBaseFields>>;

		type SharedField = Partial<Pick<WorkflowEntity, 'shared'>>;

		type OwnedByField = { ownedBy: Pick<IUser, 'id'> | null };

		export type Plain = BaseFields;

		export type WithSharing = BaseFields & SharedField;

		export type WithOwnership = BaseFields & OwnedByField;
	}
}

export namespace Credentials {
	type SlimUser = Pick<IUser, 'id' | 'email' | 'firstName' | 'lastName'>;

	type OwnedByField = { ownedBy: SlimUser | null };

	type SharedWithField = { sharedWith: SlimUser[] };

	export type WithOwnedByAndSharedWith = CredentialsEntity & OwnedByField & SharedWithField;
}

export function hasSharing(
	workflows: ListQuery.Workflow.Plain[] | ListQuery.Workflow.WithSharing[],
): workflows is ListQuery.Workflow.WithSharing[] {
	return workflows.some((w) => 'shared' in w);
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

	type Share = AuthenticatedRequest<{ credentialId: string }, {}, { shareWithIds: string[] }>;
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
	export type UserSettingsUpdate = AuthenticatedRequest<{}, {}, UserSettingsUpdatePayload>;
	export type UserUpdate = AuthenticatedRequest<{}, {}, UserUpdatePayload>;
	export type Password = AuthenticatedRequest<
		{},
		{},
		{ currentPassword: string; newPassword: string; token?: string }
	>;
	export type SurveyAnswers = AuthenticatedRequest<{}, {}, Record<string, string> | {}>;
}

export interface UserSetupPayload {
	email: string;
	password: string;
	firstName: string;
	lastName: string;
	mfaEnabled?: boolean;
	mfaSecret?: string;
	mfaRecoveryCodes?: string[];
}

// ----------------------------------
//             /owner
// ----------------------------------

export declare namespace OwnerRequest {
	type Post = AuthenticatedRequest<{}, {}, UserSetupPayload, {}>;

	type DismissBanner = AuthenticatedRequest<{}, {}, Partial<{ bannerName: BannerName }>, {}>;
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
		Pick<PublicUser, 'password'> & { token?: string; userId?: string; mfaToken?: string }
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

	export type PasswordResetLink = AuthenticatedRequest<{ id: string }, {}, {}, {}>;

	export type UserSettingsUpdate = AuthenticatedRequest<
		{ id: string },
		{},
		UserSettingsUpdatePayload
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
		mfaToken?: string;
		mfaRecoveryCode?: string;
	}
>;

// ----------------------------------
//          MFA endpoints
// ----------------------------------

export declare namespace MFA {
	type Verify = AuthenticatedRequest<{}, {}, { token: string }, {}>;
	type Activate = AuthenticatedRequest<{}, {}, { token: string }, {}>;
	type Config = AuthenticatedRequest<{}, {}, { login: { enabled: boolean } }, {}>;
	type ValidateRecoveryCode = AuthenticatedRequest<
		{},
		{},
		{ recoveryCode: { enabled: boolean } },
		{}
	>;
}

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
//        /node-list-search
// ----------------------------------

export type NodeListSearchRequest = AuthenticatedRequest<
	{},
	{},
	{},
	{
		nodeTypeAndVersion: string;
		methodName: string;
		path: string;
		currentNodeParameters: string;
		credentials: string;
		filter?: string;
		paginationToken?: string;
	}
>;

// ----------------------------------
//        /get-mapping-fields
// ----------------------------------

export type ResourceMapperRequest = AuthenticatedRequest<
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
	type GetAll = AuthenticatedRequest<{}, {}, {}, { withUsageCount: string }>;
	type Create = AuthenticatedRequest<{}, {}, { name: string }>;
	type Update = AuthenticatedRequest<{ id: string }, {}, { name: string }>;
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

// ----------------------------------
//           /curl-to-json
// ----------------------------------

export declare namespace CurlHelper {
	type ToJson = AuthenticatedRequest<{}, {}, { curlCommand?: string }>;
}

// ----------------------------------
//           /license
// ----------------------------------

export declare namespace LicenseRequest {
	type Activate = AuthenticatedRequest<{}, {}, { activationKey: string }, {}>;
}

export type BinaryDataRequest = AuthenticatedRequest<
	{ path: string },
	{},
	{},
	{
		mode: 'view' | 'download';
		fileName?: string;
		mimeType?: string;
	}
>;

// ----------------------------------
//           /variables
// ----------------------------------
//
export declare namespace VariablesRequest {
	type CreateUpdatePayload = Omit<Variables, 'id'> & { id?: unknown };

	type GetAll = AuthenticatedRequest;
	type Get = AuthenticatedRequest<{ id: string }, {}, {}, {}>;
	type Create = AuthenticatedRequest<{}, {}, CreateUpdatePayload, {}>;
	type Update = AuthenticatedRequest<{ id: string }, {}, CreateUpdatePayload, {}>;
	type Delete = Get;
}

export declare namespace ExternalSecretsRequest {
	type GetProviderResponse = Pick<SecretsProvider, 'displayName' | 'name' | 'properties'> & {
		icon: string;
		connected: boolean;
		connectedAt: Date | null;
		state: SecretsProviderState;
		data: IDataObject;
	};

	type GetProviders = AuthenticatedRequest;
	type GetProvider = AuthenticatedRequest<{ provider: string }, GetProviderResponse>;
	type SetProviderSettings = AuthenticatedRequest<{ provider: string }, {}, IDataObject>;
	type TestProviderSettings = SetProviderSettings;
	type SetProviderConnected = AuthenticatedRequest<
		{ provider: string },
		{},
		{ connected: boolean }
	>;

	type UpdateProvider = AuthenticatedRequest<{ provider: string }>;
}

// ----------------------------------
//           /orchestration
// ----------------------------------
//
export declare namespace OrchestrationRequest {
	type GetAll = AuthenticatedRequest;
	type Get = AuthenticatedRequest<{ id: string }, {}, {}, {}>;
}
