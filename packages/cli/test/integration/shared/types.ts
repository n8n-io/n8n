import type { Application } from 'express';
import type { Server } from 'http';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import type TestAgent from 'supertest/lib/agent';

import type { CredentialsEntity } from '@/databases/entities/credentials-entity';
import type { Project } from '@/databases/entities/project';
import type { User } from '@/databases/entities/user';
import type { BooleanLicenseFeature, ICredentialsDb, NumericLicenseFeature } from '@/interfaces';

import type { LicenseMocker } from './license';

type EndpointGroup =
	| 'health'
	| 'me'
	| 'users'
	| 'auth'
	| 'oauth2'
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
	| 'annotationTags'
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
	| 'dynamic-node-parameters'
	| 'apiKeys'
	| 'evaluation';

export interface SetupProps {
	endpointGroups?: EndpointGroup[];
	enabledFeatures?: BooleanLicenseFeature[];
	quotas?: Partial<{ [K in NumericLicenseFeature]: number }>;
}

export type SuperAgentTest = TestAgent;

export interface TestServer {
	app: Application;
	httpServer: Server;
	authAgentFor: (user: User) => TestAgent;
	publicApiAgentFor: (user: User) => TestAgent;
	publicApiAgentWithApiKey: (apiKey: string) => TestAgent;
	publicApiAgentWithoutApiKey: () => TestAgent;
	authlessAgent: TestAgent;
	restlessAgent: TestAgent;
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
