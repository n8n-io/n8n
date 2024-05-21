import type { Application } from 'express';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import type { SuperAgentTest } from 'supertest';
import type { Server } from 'http';

import type { CredentialsEntity } from '@db/entities/CredentialsEntity';
import type { User } from '@db/entities/User';
import type { BooleanLicenseFeature, ICredentialsDb, NumericLicenseFeature } from '@/Interfaces';
import type { LicenseMocker } from './license';
import type { Project } from '@/databases/entities/Project';

type EndpointGroup =
	| 'me'
	| 'users'
	| 'auth'
	| 'owner'
	| 'passwordReset'
	| 'credentials'
	| 'workflows'
	| 'publicApi'
	| 'community-packages'
	| 'ldap'
	| 'saml'
	| 'sourceControl'
	| 'eventBus'
	| 'license'
	| 'variables'
	| 'tags'
	| 'externalSecrets'
	| 'mfa'
	| 'metrics'
	| 'executions'
	| 'workflowHistory'
	| 'binaryData'
	| 'invitations'
	| 'debug'
	| 'project'
	| 'role'
	| 'dynamic-node-parameters';

export interface SetupProps {
	endpointGroups?: EndpointGroup[];
	enabledFeatures?: BooleanLicenseFeature[];
	quotas?: Partial<{ [K in NumericLicenseFeature]: number }>;
}

export interface TestServer {
	app: Application;
	httpServer: Server;
	authAgentFor: (user: User) => SuperAgentTest;
	publicApiAgentFor: (user: User) => SuperAgentTest;
	authlessAgent: SuperAgentTest;
	license: LicenseMocker;
}

export type CredentialPayload = {
	name: string;
	type: string;
	data: ICredentialDataDecryptedObject;
};

export type SaveCredentialFunction = (
	credentialPayload: CredentialPayload,
	options: { user: User } | { project: Project },
) => Promise<CredentialsEntity & ICredentialsDb>;
