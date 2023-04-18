import type { ICredentialDataDecryptedObject, ICredentialNodeAccess } from 'n8n-workflow';
import type { SuperAgentTest } from 'supertest';

import type { CredentialsEntity } from '@db/entities/CredentialsEntity';
import type { User } from '@db/entities/User';
import type { ICredentialsDb, IDatabaseCollections } from '@/Interfaces';

export type CollectionName = keyof IDatabaseCollections;

export type ApiPath = 'internal' | 'public';

export type AuthAgent = (user: User) => SuperAgentTest;

type EndpointGroup =
	| 'me'
	| 'users'
	| 'auth'
	| 'owner'
	| 'passwordReset'
	| 'credentials'
	| 'workflows'
	| 'publicApi'
	| 'nodes'
	| 'ldap'
	| 'saml'
	| 'eventBus'
	| 'license'
	| 'variables';

export type CredentialPayload = {
	name: string;
	type: string;
	nodesAccess?: ICredentialNodeAccess[];
	data: ICredentialDataDecryptedObject;
};

export type SaveCredentialFunction = (
	credentialPayload: CredentialPayload,
	{ user }: { user: User },
) => Promise<CredentialsEntity & ICredentialsDb>;

export type PostgresSchemaSection = {
	[K in 'host' | 'port' | 'schema' | 'user' | 'password']: { env: string };
};

export type InstalledPackagePayload = {
	packageName: string;
	installedVersion: string;
};

export type InstalledNodePayload = {
	name: string;
	type: string;
	latestVersion: number;
	package: string;
};
