import {
	randomCredentialPayload,
	randomEmail,
	randomName,
	uniqueId,
} from '@n8n/backend-test-utils';
import { CredentialsEntity, Project, User } from '@n8n/db';
import { randomInt } from 'n8n-workflow';

export const mockCredential = (): CredentialsEntity =>
	Object.assign(new CredentialsEntity(), randomCredentialPayload());

export const mockUser = (): User =>
	Object.assign(new User(), {
		id: randomInt(1000),
		email: randomEmail(),
		firstName: randomName(),
		lastName: randomName(),
	});

/**
 * Creates a lightweight User object for tests that only need specific properties (e.g. `role`).
 *
 * Prefer this over `mock<User>({ role: SOME_ROLE })` if you just need a user object,
 * without any assertions or spying on it because excessive mock objects greatly slow down tests.
 */
export const createTestUser = (overrides: Partial<User> = {}): User =>
	({ ...overrides }) as unknown as User;

export const mockProject = (): Project =>
	Object.assign(new Project(), {
		id: uniqueId(),
		type: 'personal',
		name: 'Nathan Fillion <nathan.fillion@n8n.io>',
	});
