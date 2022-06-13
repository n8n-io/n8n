import type { ICredentialDataDecryptedObject, ICredentialNodeAccess } from 'n8n-workflow';
import type { ICredentialsDb, IDatabaseCollections } from '../../../src';
import type { CredentialsEntity } from '../../../src/databases/entities/CredentialsEntity';
import type { User } from '../../../src/databases/entities/User';

export type CollectionName = keyof IDatabaseCollections;

export type SmtpTestAccount = {
	user: string;
	pass: string;
	smtp: {
		host: string;
		port: number;
		secure: boolean;
	};
};

export type ApiPath = 'internal' | 'public';

type EndpointGroup = 'me' | 'users' | 'auth' | 'owner' | 'passwordReset' | 'credentials' | 'publicApi';

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

export interface TriggerTime {
	mode: string;
	hour: number;
	minute: number;
	dayOfMonth: number;
	weekeday: number;
	[key: string]: string | number;
}
