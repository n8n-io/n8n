import { Service } from '@n8n/di';
import type { CredentialsEntity } from '@n8n/db';

import type { Serializer } from '../serializer';
import type { SerializedCredential } from './credential.types';

@Service()
export class CredentialSerializer implements Serializer<CredentialsEntity, SerializedCredential> {
	serialize(credential: CredentialsEntity): SerializedCredential {
		return {
			id: credential.id,
			name: credential.name,
			type: credential.type,
		};
	}
}
