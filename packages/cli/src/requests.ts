import type { ProjectIcon, ProjectType } from '@n8n/api-types';
import type {
	APIRequest,
	AuthenticatedRequest,
	Variables,
	Project,
	User,
	ListQueryDb,
	WorkflowHistory,
} from '@n8n/db';
import type {
	AssignableGlobalRole,
	AssignableProjectRole,
	GlobalRole,
	ProjectRole,
	Scope,
} from '@n8n/permissions';
import type {
	ICredentialDataDecryptedObject,
	INodeCredentialTestRequest,
	IPersonalizationSurveyAnswersV4,
} from 'n8n-workflow';

export type AuthlessRequest<
	RouteParams = {},
	ResponseBody = {},
	RequestBody = {},
	RequestQuery = {},
> = APIRequest<RouteParams, ResponseBody, RequestBody, RequestQuery>;

export namespace ListQuery {
	export type Request = AuthenticatedRequest<{}, {}, {}, Params> & {
		listQueryOptions?: Options;
	};

	export type Params = {
		filter?: string;
		skip?: string;
		take?: string;
		select?: string;
		sortBy?: string;
	};

	export type Options = {
		filter?: Record<string, unknown>;
		select?: Record<string, true>;
		skip?: number;
		take?: number;
		sortBy?: string;
	};
}

// ----------------------------------
//            list query
// ----------------------------------

export function hasSharing(
	workflows: ListQueryDb.Workflow.Plain[] | ListQueryDb.Workflow.WithSharing[],
): workflows is ListQueryDb.Workflow.WithSharing[] {
	return workflows.some((w) => 'shared' in w);
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
		isManaged?: boolean;
	}>;

	type Get = AuthenticatedRequest<{ credentialId: string }, {}, {}, Record<string, string>>;

	type GetMany = AuthenticatedRequest<
		{},
		{},
		{},
		ListQuery.Params & { includeScopes?: string; includeFolders?: string }
	> & {
		listQueryOptions: ListQuery.Options;
	};

	type Delete = Get;

	type GetAll = AuthenticatedRequest<{}, {}, {}, { filter: string }>;

	type Update = AuthenticatedRequest<{ credentialId: string }, {}, CredentialProperties>;

	type Test = AuthenticatedRequest<{}, {}, INodeCredentialTestRequest>;

	type Share = AuthenticatedRequest<{ credentialId: string }, {}, { shareWithIds: string[] }>;

	type Transfer = AuthenticatedRequest<
		{ credentialId: string },
		{},
		{ destinationProjectId: string }
	>;

	type ForWorkflow = AuthenticatedRequest<
		{},
		{},
		{},
		{ workflowId: string } | { projectId: string }
	>;
}

// ----------------------------------
//               /me
// ----------------------------------

export declare namespace MeRequest {
	export type SurveyAnswers = AuthenticatedRequest<{}, {}, IPersonalizationSurveyAnswersV4>;
}

// ----------------------------------
//             /users
// ----------------------------------

export declare namespace UserRequest {
	export type InviteResponse = {
		user: {
			id: string;
			email: string;
			inviteAcceptUrl?: string;
			emailSent: boolean;
			role: AssignableGlobalRole;
		};
		error?: string;
	};

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
		{ limit?: number; offset?: number; cursor?: string; includeRole?: boolean; projectId?: string }
	>;

	export type PasswordResetLink = AuthenticatedRequest<{ id: string }, {}, {}, {}>;
}

// ----------------------------------
//          MFA endpoints
// ----------------------------------

export declare namespace MFA {
	type Enforce = AuthenticatedRequest<{}, {}, { enforce: boolean }, {}>;
	type Verify = AuthenticatedRequest<{}, {}, { mfaCode: string }, {}>;
	type Activate = AuthenticatedRequest<{}, {}, { mfaCode: string }, {}>;
	type Disable = AuthenticatedRequest<{}, {}, { mfaCode?: string; mfaRecoveryCode?: string }, {}>;
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
//             /annotation-tags
// ----------------------------------

export declare namespace AnnotationTagsRequest {
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

	type Post = AuthenticatedRequest<
		{},
		{},
		{ name?: string; verify?: boolean; version?: string; checksum?: string }
	>;

	type Delete = AuthenticatedRequest<{}, {}, {}, { name: string }>;

	type Update = Post;
}

// ----------------------------------
//           /license
// ----------------------------------

export declare namespace LicenseRequest {
	type Activate = AuthenticatedRequest<{}, {}, { activationKey: string }, {}>;
}

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
	type GetMyProjectsResponse = Array<
		Project & { role: ProjectRole | AssignableProjectRole | GlobalRole; scopes?: Scope[] }
	>;

	type ProjectRelationResponse = {
		id: string;
		email: string;
		firstName: string;
		lastName: string;
		role: ProjectRole | AssignableProjectRole;
	};
	type ProjectWithRelations = {
		id: string;
		name: string | undefined;
		icon: ProjectIcon | null;
		type: ProjectType;
		description: string | null;
		relations: ProjectRelationResponse[];
		scopes: Scope[];
	};
}

// ----------------------------------
//           /nps-survey
// ----------------------------------
export declare namespace NpsSurveyRequest {
	// can be refactored to
	// type NpsSurveyUpdate = AuthenticatedRequest<{}, {}, NpsSurveyState>;
	// once some schema validation is added
	type NpsSurveyUpdate = AuthenticatedRequest<{}, {}, unknown>;
}
