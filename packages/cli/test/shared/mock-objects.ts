import { CredentialsEntity } from '@n8n/db';
import { Project } from '@n8n/db';
import { User } from '@n8n/db';
import { randomInt } from 'n8n-workflow';

import {
	randomCredentialPayload,
	randomEmail,
	randomName,
	uniqueId,
} from '../integration/shared/random';

export const mockCredential = (): CredentialsEntity =>
	Object.assign(new CredentialsEntity(), randomCredentialPayload());

export const mockUser = (): User =>
	Object.assign(new User(), {
		id: randomInt(1000),
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
