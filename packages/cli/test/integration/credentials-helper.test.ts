import { testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';

import { CredentialsHelper } from '@/credentials-helper';

import { createOwner, createAdmin, createMember } from './shared/db/users';

let credentialHelper: CredentialsHelper;
let owner: User;
let admin: User;
let member: User;

beforeAll(async () => {
	await testDb.init();

	credentialHelper = Container.get(CredentialsHelper);
	owner = await createOwner();
	admin = await createAdmin();
	member = await createMember();
});

afterAll(async () => {
	await testDb.terminate();
});

describe('CredentialsHelper', () => {
	// TODO: add tests
});
