import { User } from '@db/entities/User';
import { CredentialsEntity } from '@db/entities/CredentialsEntity';

import {
	randomCredentialPayload,
	randomEmail,
	randomInteger,
	randomName,
	uniqueId,
} from '../../integration/shared/random';
import { Project } from '@/databases/entities/Project';

export const mockCredential = (): CredentialsEntity =>
	Object.assign(new CredentialsEntity(), randomCredentialPayload());

export const mockUser = (): User =>
	Object.assign(new User(), {
		id: randomInteger(),
		email: randomEmail(),
		firstName: randomName(),
		lastName: randomName(),
	});

export const mockProject = (): Project =>
	Object.assign(new Project(), {
		id: uniqueId(),
		type: 'personal',
		name: 'Nathan Fillion <nathan.fillion@n8n.io>',
	});
