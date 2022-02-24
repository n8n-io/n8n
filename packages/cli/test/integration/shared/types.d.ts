import type { ICredentialDataDecryptedObject, ICredentialNodeAccess } from 'n8n-workflow';
import type { ICredentialsDb } from '../../../src';
import type { CredentialsEntity } from '../../../src/databases/entities/CredentialsEntity';
import type { User } from '../../../src/databases/entities/User';

export type SmtpTestAccount = {
	user: string;
	pass: string;
	smtp: {
		host: string;
		port: number;
		secure: boolean;
	};
};

type EndpointGroup = 'me' | 'users' | 'auth' | 'owner' | 'passwordReset' | 'credentials';

export type CredentialPayload = {
	name: string;
	type: string;
	nodesAccess: ICredentialNodeAccess[];
	data: ICredentialDataDecryptedObject;
};

export type SaveCredentialFunction = (
	credentialPayload: CredentialPayload,
	{ user }: { user: User },
) => Promise<CredentialsEntity & ICredentialsDb>;
