import type { CreateCredentialDto } from '@n8n/api-types';
import type { CredentialsEntity } from '@n8n/db';
import type { Scope } from '@n8n/permissions';
import { nanoId, date } from 'minifaker';
import { randomString } from 'n8n-workflow';

export type NewCredentialWithScopes = CredentialsEntity & { scopes: Scope[] };

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

export const createNewCredentialsPayload = (payload?: Partial<CreateCredentialDto>) => {
	return {
		name,
		type,
		data,
		projectId,
		...payload,
	};
};

export const createdCredentialsWithScopes = (
	payload?: Partial<NewCredentialWithScopes>,
): NewCredentialWithScopes => {
	return {
		name: payload?.name ?? name,
		type: payload?.type ?? type,
		data: payload?.data ?? randomString(20),
		id: payload?.id ?? nanoId.nanoid(),
		createdAt: payload?.createdAt ?? date(),
		updatedAt: payload?.updatedAt ?? date(),
		isManaged: payload?.isManaged ?? false,
		isGlobal: payload?.isGlobal ?? false,
		isResolvable: payload?.isResolvable ?? false,
		resolvableAllowFallback: payload?.resolvableAllowFallback ?? false,
		resolverId: payload?.resolverId ?? null,
		scopes: payload?.scopes ?? credentialScopes,
	} as NewCredentialWithScopes;
};
