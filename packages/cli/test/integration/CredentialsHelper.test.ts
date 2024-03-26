import Container from 'typedi';
import * as testDb from '../integration/shared/testDb';

import { CredentialsHelper } from '@/CredentialsHelper';
import { createOwner, createAdmin, createMember } from './shared/db/users';
import type { User } from '@/databases/entities/User';
import { saveCredential } from './shared/db/credentials';
import { randomCredentialPayload } from './shared/random';

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

describe('CredentialsHelper', () => {
	describe('credentialOwnedBySuperUsers', () => {
		test.each([
			{
				testName: 'owners are super users',
				user: () => owner,
				credentialRole: 'credential:owner',
				expectedResult: true,
			} as const,
			{
				testName: 'admins are super users',
				user: () => admin,
				credentialRole: 'credential:owner',
				expectedResult: true,
			} as const,
			{
				testName: 'owners need to own the credential',
				user: () => owner,
				credentialRole: 'credential:user',
				expectedResult: false,
			} as const,
			{
				testName: 'admins need to own the credential',
				user: () => admin,
				credentialRole: 'credential:user',
				expectedResult: false,
			} as const,
			{
				testName: 'members are no super users',
				user: () => member,
				credentialRole: 'credential:owner',
				expectedResult: false,
			} as const,
		])('$testName', async ({ user, credentialRole, expectedResult }) => {
			const credential = await saveCredential(randomCredentialPayload(), {
				user: user(),
				role: credentialRole,
			});

			const result = await credentialHelper.credentialOwnedBySuperUsers(credential);

			expect(result).toBe(expectedResult);
		});
	});
});
