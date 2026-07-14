import type { CredentialsEntity } from '@n8n/db';
import { Service } from '@n8n/di';

import {
	serializedCredentialSchema,
	type SerializedCredential,
} from '../../spec/serialized/credential.schema';

@Service()
export class CredentialSerializer {
	serialize(credential: CredentialsEntity): SerializedCredential {
		return serializedCredentialSchema.parse({
			id: credential.id,
			name: credential.name,
			type: credential.type,
		});
	}
}
