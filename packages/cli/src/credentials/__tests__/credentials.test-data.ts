import type { CreateCredentialDto } from '@n8n/api-types';
import type { CredentialsEntity, SharedCredentials } from '@n8n/db';
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

export const mockExistingCredential = (overrides?: {
	data?: Record<string, unknown>;
	projectId?: string;
	[key: string]: unknown;
}): CredentialsEntity => {
	const credId = (overrides?.id as string) ?? nanoId.nanoid();
	const projId = overrides?.projectId ?? projectId;

	return {
		id: credId,
		createdAt: date(),
		updatedAt: date(),

		name,
		type,
		data: overrides?.data ? JSON.stringify(overrides.data) : {},

		isManaged: false,
		isGlobal: false,
		isResolvable: false,
		resolvableAllowFallback: false,
		resolverId: null,

		shared: [
			{
				role: 'credential:owner',
				projectId: projId,
				credentialsId: credId,
				createdAt: date(),
				updatedAt: date(),
			} as SharedCredentials,
		],
		...overrides,
	} as CredentialsEntity;
};
