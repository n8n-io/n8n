import { User } from '@db/entities/User';
import { Role } from '@db/entities/Role';
import { CredentialsEntity } from '@db/entities/CredentialsEntity';

import {
	randomCredentialPayload,
	randomEmail,
	randomInteger,
	randomName,
} from '../../integration/shared/random';

export const wfOwnerRole = () =>
	Object.assign(new Role(), {
		scope: 'workflow',
		name: 'owner',
		id: randomInteger(),
	});

export const mockCredRole = (name: 'owner' | 'editor'): Role =>
	Object.assign(new Role(), {
		scope: 'credentials',
		name,
		id: randomInteger(),
	});

export const mockCredential = (): CredentialsEntity =>
	Object.assign(new CredentialsEntity(), randomCredentialPayload());

export const mockUser = (): User =>
	Object.assign(new User(), {
		id: randomInteger(),
		email: randomEmail(),
		firstName: randomName(),
		lastName: randomName(),
	});

export const mockInstanceOwnerRole = () =>
	Object.assign(new Role(), {
		scope: 'global',
		name: 'owner',
		id: randomInteger(),
	});
