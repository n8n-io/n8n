import type express from 'express';
import type {
	BannerName,
	ICredentialDataDecryptedObject,
	IDataObject,
	ILoadOptions,
	INodeCredentialTestRequest,
	INodeCredentials,
	INodeParameters,
	INodeTypeNameVersion,
	IUser,
} from 'n8n-workflow';

import { Expose } from 'class-transformer';
import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, Length } from 'class-validator';
import { NoXss } from '@db/utils/customValidators';
import type { PublicUser, SecretsProvider, SecretsProviderState } from '@/Interfaces';
import { AssignableRole } from '@db/entities/User';
import type { GlobalRole, User } from '@db/entities/User';
import type { Variables } from '@db/entities/Variables';
import type { WorkflowEntity } from '@db/entities/WorkflowEntity';
import type { CredentialsEntity } from '@db/entities/CredentialsEntity';
import type { WorkflowHistory } from '@db/entities/WorkflowHistory';
import type { Project, ProjectType } from '@db/entities/Project';
import type { ProjectRole } from './databases/entities/ProjectRelation';
import type { Scope } from '@n8n/permissions';

export class UserUpdatePayload implements Pick<User, 'email' | 'firstName' | 'lastName'> {
	@Expose()
	@IsEmail()
	email: string;

	@Expose()
	@NoXss()
	@IsString({ message: 'First name must be of type string.' })
	@Length(1, 32, { message: 'First name must be $constraint1 to $constraint2 characters long.' })
	firstName: string;

	@Expose()
	@NoXss()
	@IsString({ message: 'Last name must be of type string.' })
	@Length(1, 32, { message: 'Last name must be $constraint1 to $constraint2 characters long.' })
	lastName: string;
}

export class UserSettingsUpdatePayload {
	@Expose()
	@IsBoolean({ message: 'userActivated should be a boolean' })
	@IsOptional()
	userActivated: boolean;

	@Expose()
	@IsBoolean({ message: 'allowSSOManualLogin should be a boolean' })
	@IsOptional()
	allowSSOManualLogin?: boolean;
}

export class UserRoleChangePayload {
	@Expose()
	@IsIn(['global:admin', 'global:member'])
	newRoleName: AssignableRole;
}

export type APIRequest<
	RouteParams = {},
	ResponseBody = {},
	RequestBody = {},
	RequestQuery = {},
> = express.Request<RouteParams, ResponseBody, RequestBody, RequestQuery> & {
	browserId?: string;
};

export type AuthlessRequest<
	RouteParams = {},
	ResponseBody = {},
	RequestBody = {},
	RequestQuery = {},
> = APIRequest<RouteParams, ResponseBody, RequestBody, RequestQuery> & {
	user: never;
};

export type AuthenticatedRequest<
	RouteParams = {},
	ResponseBody = {},
	RequestBody = {},
	RequestQuery = {},
> = Omit<APIRequest<RouteParams, ResponseBody, RequestBody, RequestQuery>, 'user' | 'cookies'> & {
	user: User;
	cookies: Record<string, string | undefined>;
};

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

		type OwnedByField = { ownedBy: SlimUser | null; homeProject: SlimProject | null };

		type ScopesField = { scopes: Scope[] };

		export type Plain = BaseFields;

		export type WithSharing = BaseFields & SharedField;

		export type WithOwnership = BaseFields & OwnedByField;

		type SharedWithField = { sharedWith: SlimUser[]; sharedWithProjects: SlimProject[] };

		export type WithOwnedByAndSharedWith = BaseFields &
			OwnedByField &
			SharedWithField &
			SharedField;

		export type WithScopes = BaseFields & ScopesField & SharedField;
	}

	export namespace Credentials {
		type OwnedByField = { homeProject: SlimProject | null };

		type SharedField = Partial<Pick<CredentialsEntity, 'shared'>>;

		type SharedWithField = { sharedWithProjects: SlimProject[] };

		type ScopesField = { scopes: Scope[] };

		export type WithSharing = CredentialsEntity & SharedField;

		export type WithOwnedByAndSharedWith = CredentialsEntity &
			OwnedByField &
			SharedWithField &
			SharedField;

		export type WithScopes = CredentialsEntity & ScopesField & SharedField;
	}
}

type SlimUser = Pick<IUser, 'id' | 'email' | 'firstName' | 'lastName'>;
export type SlimProject = Pick<Project, 'id' | 'type' | 'name'>;

export function hasSharing(
	workflows: ListQuery.Workflow.Plain[] | ListQuery.Workflow.WithSharing[],
): workflows is ListQuery.Workflow.WithSharing[] {
	return workflows.some((w) => 'shared' in w);
}

// ----------------------------------
//          /ai
// ----------------------------------

export declare namespace AIRequest {
	export type GenerateCurl = AuthenticatedRequest<{}, {}, AIGenerateCurlPayload>;
}

export interface AIGenerateCurlPayload {
	service: string;
	request: string;
}

// ----------------------------------
//          /credentials
// ----------------------------------

export declare namespace CredentialRequest {
	type CredentialProperties = Partial<{
		id: string; // deleted if sent
		name: string;
		type: string;
		data: ICredentialDataDecryptedObject;
		projectId?: string;
	}>;

	type Create = AuthenticatedRequest<{}, {}, CredentialProperties>;

	type Get = AuthenticatedRequest<{ credentialId: string }, {}, {}, Record<string, string>>;

	type GetMany = AuthenticatedRequest<{}, {}, {}, ListQuery.Params & { includeScopes?: string }> & {
		listQueryOptions: ListQuery.Options;
	};

	type Delete = Get;

	type GetAll = AuthenticatedRequest<{}, {}, {}, { filter: string }>;

	type Update = AuthenticatedRequest<{ credentialId: string }, {}, CredentialProperties>;

	type NewName = AuthenticatedRequest<{}, {}, {}, { name?: string }>;

	type Test = AuthenticatedRequest<{}, {}, INodeCredentialTestRequest>;

	type Share = AuthenticatedRequest<{ credentialId: string }, {}, { shareWithIds: string[] }>;

	type Transfer = AuthenticatedRequest<
		{ credentialId: string },
		{},
		{ destinationProjectId: string }
	>;
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
	export type Invite = AuthenticatedRequest<
		{},
		{},
		Array<{ email: string; role?: AssignableRole }>
	>;

	export type InviteResponse = {
		user: { id: string; email: string; inviteAcceptUrl?: string; emailSent: boolean };
		error?: string;
	};

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

	export type ChangeRole = AuthenticatedRequest<{ id: string }, {}, UserRoleChangePayload, {}>;

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
			{ oauth_verifier: string; oauth_token: string; state: string }
		> & {
			user?: User;
		};
	}

	namespace OAuth2Credential {
		type Auth = AuthenticatedRequest<{}, {}, {}, { id: string }>;
		type Callback = AuthenticatedRequest<{}, {}, {}, { code: string; state: string }>;
	}
}

// ----------------------------------
//      /dynamic-node-parameters
// ----------------------------------
export declare namespace DynamicNodeParametersRequest {
	type BaseRequest<RequestBody = {}> = AuthenticatedRequest<
		{},
		{},
		{
			path: string;
			nodeTypeAndVersion: INodeTypeNameVersion;
			currentNodeParameters: INodeParameters;
			methodName?: string;
			credentials?: INodeCredentials;
		} & RequestBody,
		{}
	>;

	/** POST /dynamic-node-parameters/options */
	type Options = BaseRequest<{
		loadOptions?: ILoadOptions;
	}>;

	/** POST /dynamic-node-parameters/resource-locator-results */
	type ResourceLocatorResults = BaseRequest<{
		methodName: string;
		filter?: string;
		paginationToken?: string;
	}>;

	/** POST dynamic-node-parameters/resource-mapper-fields */
	type ResourceMapperFields = BaseRequest<{
		methodName: string;
	}>;
}

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
	{},
	{},
	{},
	{
		id: string;
		action: 'view' | 'download';
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

// ----------------------------------
//           /workflow-history
// ----------------------------------

export declare namespace WorkflowHistoryRequest {
	type GetList = AuthenticatedRequest<
		{ workflowId: string },
		Array<Omit<WorkflowHistory, 'nodes' | 'connections'>>,
		{},
		ListQuery.Options
	>;
	type GetVersion = AuthenticatedRequest<
		{ workflowId: string; versionId: string },
		WorkflowHistory
	>;
}

// ----------------------------------
//        /active-workflows
// ----------------------------------

export declare namespace ActiveWorkflowRequest {
	type GetAllActive = AuthenticatedRequest;

	type GetActivationError = AuthenticatedRequest<{ id: string }>;
}

// ----------------------------------
//           /projects
// ----------------------------------

export declare namespace ProjectRequest {
	type GetAll = AuthenticatedRequest<{}, Project[]>;

	type Create = AuthenticatedRequest<
		{},
		Project,
		{
			name: string;
		}
	>;

	type GetMyProjects = AuthenticatedRequest<
		{},
		Array<Project & { role: ProjectRole }>,
		{},
		{
			includeScopes?: boolean;
		}
	>;
	type GetMyProjectsResponse = Array<
		Project & { role: ProjectRole | GlobalRole; scopes?: Scope[] }
	>;

	type GetPersonalProject = AuthenticatedRequest<{}, Project>;

	type ProjectRelationPayload = { userId: string; role: ProjectRole };
	type ProjectRelationResponse = {
		id: string;
		email: string;
		firstName: string;
		lastName: string;
		role: ProjectRole;
	};
	type ProjectWithRelations = {
		id: string;
		name: string | undefined;
		type: ProjectType;
		relations: ProjectRelationResponse[];
		scopes: Scope[];
	};

	type Get = AuthenticatedRequest<{ projectId: string }, {}>;
	type Update = AuthenticatedRequest<
		{ projectId: string },
		{},
		{ name?: string; relations?: ProjectRelationPayload[] }
	>;
	type Delete = AuthenticatedRequest<{ projectId: string }, {}, {}, { transferId?: string }>;
}
