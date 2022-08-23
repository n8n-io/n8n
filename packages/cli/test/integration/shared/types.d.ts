import type { ICredentialDataDecryptedObject, ICredentialNodeAccess } from 'n8n-workflow';
import type { SuperAgentTest } from 'supertest';

import type { ICredentialsDb, IDatabaseCollections } from '../../../src';
import type { CredentialsEntity } from '../../../src/databases/entities/CredentialsEntity';
import type { User } from '../../../src/databases/entities/User';
import { MAPPING_TABLES } from './constants';

export type CollectionName = keyof IDatabaseCollections;

export type MappingName = keyof typeof MAPPING_TABLES;

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
	| 'nodes';

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
