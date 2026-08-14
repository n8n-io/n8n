import type { CredentialsEntity } from '@n8n/db';
import { Service } from '@n8n/di';

import {
	serializedCredentialSchema,
	type SerializedCredential,
} from '../../spec/serialized/credential.schema';
import { definePackageSerializationPayload } from '../package-serialization.types';

type CredentialPackageKeyHandling = {
	id: 'copy';
	createdAt: 'exclude';
	updatedAt: 'exclude';
	name: 'copy';
	data: 'exclude';
	type: 'copy';
	shared: 'exclude';
	isManaged: 'exclude';
	isGlobal: 'exclude';
	isResolvable: 'exclude';
	resolvableAllowFallback: 'exclude';
	resolverId: 'exclude';
	usageScope: 'exclude';
};

const serializePayload = definePackageSerializationPayload<
	CredentialsEntity,
	SerializedCredential,
	CredentialPackageKeyHandling
>();

@Service()
export class CredentialSerializer {
	serialize(credential: CredentialsEntity): SerializedCredential {
		return serializedCredentialSchema.parse(
			serializePayload({
				id: credential.id,
				name: credential.name,
				type: credential.type,
			}),
		);
	}
}
