import { ROUTER_ENDPOINT_GROUP, USER_MANAGEMENT_ENDPOINT_GROUP } from './constants';

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

type FunctionEndpointGroup = typeof USER_MANAGEMENT_ENDPOINT_GROUP[number];

type RouterEndpointGroup = typeof ROUTER_ENDPOINT_GROUP[number];

type EndpointGroup = FunctionEndpointGroup | RouterEndpointGroup;

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
