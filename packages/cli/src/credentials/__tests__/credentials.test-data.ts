import type { Scope } from '@n8n/permissions';
import { nanoId, date } from 'minifaker';
import { randomString } from 'n8n-workflow';

import type { CredentialRequest } from '@/requests';

type NewCredentialWithSCopes = {
	scopes: Scope[];
	name: string;
	data: string;
	type: string;
	isManaged: boolean;
	id: string;
	createdAt: Date;
	updatedAt: Date;
};

const name = 'new Credential';
const type = 'openAiApi';
const data = {
	apiKey: 'apiKey',
	url: 'url',
};
const projectId = nanoId.nanoid();

export const credentialScopes: Scope[] = [
	'credential:create',
	'credential:delete',
	'credential:list',
	'credential:move',
	'credential:read',
	'credential:share',
	'credential:update',
];

export const createNewCredentialsPayload = (
	payload?: Partial<CredentialRequest.CredentialProperties>,
): CredentialRequest.CredentialProperties => {
	return {
		name,
		type,
		data,
		projectId,
		...payload,
	};
};

export const createdCredentialsWithScopes = (
	payload?: Partial<NewCredentialWithSCopes>,
): NewCredentialWithSCopes => {
	return {
		name,
		type,
		data: randomString(20),
		id: nanoId.nanoid(),
		createdAt: date(),
		updatedAt: date(),
		isManaged: false,
		scopes: credentialScopes,
		...payload,
	};
};
