import {
	type SerializedCredential,
	type SerializedCredentialData,
	serializedCredentialSchema,
} from '@n8n/api-types';
import type { CredentialsEntity } from '@n8n/db';
import { Service } from '@n8n/di';

import { definePackageSerializationPayload } from '../package-serialization.types';

type CredentialPackageKeyHandling = {
	id: 'copy';
	createdAt: 'exclude';
	updatedAt: 'exclude';
	name: 'copy';
	description: 'copy';
	data: 'transform';
	type: 'copy';
	shared: 'exclude';
	isManaged: 'exclude';
	isGlobal: 'exclude';
	isResolvable: 'exclude';
	resolvableAllowFallback: 'exclude';
	resolverId: 'exclude';
	usageScope: 'exclude';
	pendingAuthorizationExpiresAt: 'exclude';
};

const serializePayload = definePackageSerializationPayload<
	CredentialsEntity,
	SerializedCredential,
	CredentialPackageKeyHandling
>();

@Service()
export class CredentialSerializer {
	serialize(
		credential: CredentialsEntity,
		{
			data,
			dataIsComplete,
			includeDescription,
		}: {
			data?: SerializedCredentialData;
			dataIsComplete?: boolean;
			/** Set when the source instance has credential descriptions on. An empty one exports as `null`. */
			includeDescription?: boolean;
		} = {},
	): SerializedCredential {
		return serializedCredentialSchema.parse(
			serializePayload({
				id: credential.id,
				name: credential.name,
				type: credential.type,
				...(includeDescription ? { description: credential.description ?? null } : {}),
				...(data !== undefined ? { data } : {}),
				...(dataIsComplete !== undefined ? { dataIsComplete } : {}),
			}),
		);
	}
}
