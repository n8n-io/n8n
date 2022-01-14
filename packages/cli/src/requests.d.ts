/* eslint-disable import/no-cycle */
import express = require('express');
import {
	IConnections,
	ICredentialDataDecryptedObject,
	ICredentialNodeAccess,
	INode,
	IWorkflowSettings,
} from '../../workflow/dist/src';
import { User } from './databases/entities/User';

// ----------------------------------
//      requests to /workflows
// ----------------------------------

type CreateWorkflowPayload = Partial<{
	id: string; // delete if sent
	name: string;
	nodes: INode[];
	connections: object;
	active: boolean;
	settings: object;
	tags: string[];
}>;

type UpdateWorkflowPayload = Partial<{
	id: string;
	name: string;
	nodes: INode[];
	connections: IConnections;
	settings: IWorkflowSettings;
	active: boolean;
	tags: string[];
}>;

export declare namespace WorkflowRequest {
	type Create = express.Request<{}, {}, CreateWorkflowPayload> & { user: User };

	type Get = express.Request<{ id: string }> & { user: User };

	type Delete = Get;

	type Update = express.Request<{ id: string }, {}, UpdateWorkflowPayload> & { user: User };

	type NewName = express.Request<{}, {}, {}, { name?: string }>;

	type GetAll = express.Request<{}, {}, {}, Record<string, string>> & { user: User };

	type GetAllActive = express.Request & { user: User };

	type GetAllActivationErrors = Get;
}

// ----------------------------------
//      requests to /credentials
// ----------------------------------

type CreateCredentialPayload = Partial<{
	id: string; // delete if sent
	name: string;
	type: string;
	nodesAccess: ICredentialNodeAccess[];
	data: ICredentialDataDecryptedObject;
}>;

export declare namespace CredentialRequest {
	type Create = express.Request<{}, {}, CreateCredentialPayload> & { user: User };
}
