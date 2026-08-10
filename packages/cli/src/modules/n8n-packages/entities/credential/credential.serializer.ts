import type { CredentialsEntity } from '@n8n/db';
import { Service } from '@n8n/di';

import {
	serializedCredentialSchema,
	type SerializedCredential,
} from '../../spec/serialized/credential.schema';
import {
	definePackageSerializationPayload,
	type PackageEntityKeyHandling,
} from '../package-serialization.types';

const credentialPackageKeyHandling = {
	id: 'copy',
	createdAt: 'exclude',
	updatedAt: 'exclude',
	name: 'copy',
	data: 'exclude',
	type: 'copy',
	shared: 'exclude',
	isManaged: 'exclude',
	isGlobal: 'exclude',
	isResolvable: 'exclude',
	resolvableAllowFallback: 'exclude',
	resolverId: 'exclude',
	usageScope: 'exclude',
} as const satisfies PackageEntityKeyHandling<CredentialsEntity>;

const serializePayload = definePackageSerializationPayload<
	CredentialsEntity,
	SerializedCredential,
	typeof credentialPackageKeyHandling
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
