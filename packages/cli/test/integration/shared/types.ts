import type { BooleanLicenseFeature, NumericLicenseFeature } from '@n8n/constants';
import type { CredentialsEntity } from '@n8n/db';
import type { Project } from '@n8n/db';
import type { User } from '@n8n/db';
import type { ICredentialsDb } from '@n8n/db';
import type { Application } from 'express';
import type { Server } from 'http';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import type TestAgent from 'supertest/lib/agent';

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
	| 'evaluation'
	| 'ai'
	| 'folder'
	| 'insights';

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
	isManaged?: boolean;
};

export type SaveCredentialFunction = (
	credentialPayload: CredentialPayload,
	options: { user: User } | { project: Project },
) => Promise<CredentialsEntity & ICredentialsDb>;
