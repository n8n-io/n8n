import express = require('express');
import {
	IConnections,
	ICredentialDataDecryptedObject,
	ICredentialNodeAccess,
	INode,
	IWorkflowSettings,
} from '../../workflow/dist/src';
import { User } from './databases/entities/User';

export type AuthenticatedRequest<
	RouteParams = {},
	ResponseBody = {},
	RequestBody = {},
	RequestQuery = {},
> = express.Request<RouteParams, ResponseBody, RequestBody, RequestQuery> & { user: User };

export declare namespace WorkflowRequest {
	namespace Payload {
		type Create = Partial<{
			id: string; // delete if sent
			name: string;
			nodes: INode[];
			connections: object;
			active: boolean;
			settings: object;
			tags: string[];
		}>;

		type Update = Partial<{
			id: string;
			name: string;
			nodes: INode[];
			connections: IConnections;
			settings: IWorkflowSettings;
			active: boolean;
			tags: string[];
		}>;
	}

	type Create = AuthenticatedRequest<{}, {}, Payload.Create>;

	type Get = AuthenticatedRequest<{ id: string }>;

	type Delete = Get;

	type Update = AuthenticatedRequest<{ id: string }, {}, Payload.Update>;

	type NewName = express.Request<{}, {}, {}, { name?: string }>;

	type GetAll = AuthenticatedRequest<{}, {}, {}, Record<string, string>>;

	type GetAllActive = AuthenticatedRequest;

	type GetAllActivationErrors = Get;
}

export declare namespace CredentialRequest {
	namespace Payload {
		type Create = Partial<{
			id: string; // delete if sent
			name: string;
			type: string;
			nodesAccess: ICredentialNodeAccess[];
			data: ICredentialDataDecryptedObject;
		}>;
	}

	type Create = AuthenticatedRequest<{}, {}, Payload.Create>;

	type GetAll = WorkflowRequest.GetAll;

	type NewName = WorkflowRequest.NewName;
}
