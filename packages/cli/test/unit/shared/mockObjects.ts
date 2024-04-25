import { User } from '@db/entities/User';
import { CredentialsEntity } from '@db/entities/CredentialsEntity';

import {
	randomCredentialPayload,
	randomEmail,
	randomInteger,
	randomName,
} from '../../integration/shared/random';

export const mockCredential = (): CredentialsEntity =>
	Object.assign(new CredentialsEntity(), randomCredentialPayload());

export const mockUser = (): User =>
	Object.assign(new User(), {
		id: randomInteger(),
		email: randomEmail(),
		firstName: randomName(),
		lastName: randomName(),
	});
