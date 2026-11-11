import { testDb, mockInstance } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { GLOBAL_OWNER_ROLE, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { randomString } from 'n8n-workflow';

import { AuthService } from '@/auth/auth.service';
import config from '@/config';
import { ExternalHooks } from '@/external-hooks';
import { setCurrentAuthenticationMethod } from '@/sso.ee/sso-helpers';
import { UserManagementMailer } from '@/user-management/email';

import { createLdapUser, createUser } from './shared/db/users';
import { getAuthToken, setupTestServer } from './shared/utils';

config.set('userManagement.jwtSecret', randomString(5, 10));

const externalHooks = mockInstance(ExternalHooks);
const mailer = mockInstance(UserManagementMailer, { isEmailSetUp: true });
const testServer = setupTestServer({ endpointGroups: ['changeEmail'] });

const NEW_EMAIL = 'new@example.com';

let owner: User;
let authService: AuthService;
let userRepository: UserRepository;

const tokenFor = (user: User, newEmail: string) =>
	new URL(authService.generateEmailChangeUrl(user, newEmail)).searchParams.get('token') ?? '';

const emailInDb = async (id: string) => (await userRepository.findOneByOrFail({ id })).email;

beforeEach(async () => {
	await testDb.truncate(['User']);
	owner = await createUser({
		role: GLOBAL_OWNER_ROLE,
		email: 'owner@example.com',
		password: 'password',
	});
	externalHooks.run.mockReset();
	Object.assign(mailer, { isEmailSetUp: true });
	mailer.emailChangeConfirmation.mockReset();
	mailer.emailChangeCompleted.mockReset();
	authService = Container.get(AuthService);
	userRepository = Container.get(UserRepository);
});

describe('POST /change-email', () => {
	test('should send a confirmation link to the current email and leave it unchanged', async () => {
		const response = await testServer
			.authAgentFor(owner)
			.post('/change-email')
			.send({ email: NEW_EMAIL, currentPassword: 'password' });

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toEqual({ status: 'confirmation-sent' });
		expect(mailer.emailChangeConfirmation).toHaveBeenCalledWith(
			expect.objectContaining({ email: owner.email, newEmail: NEW_EMAIL }),
		);
		expect(await emailInDb(owner.id)).toBe(owner.email);
	});

	test('should reject a wrong current password', async () => {
		const response = await testServer
			.authAgentFor(owner)
			.post('/change-email')
			.send({ email: NEW_EMAIL, currentPassword: 'wrong' });

		expect(response.statusCode).toBe(400);
		expect(mailer.emailChangeConfirmation).not.toHaveBeenCalled();
	});

	test('should leave the email unchanged when the confirmation fails to send', async () => {
		mailer.emailChangeConfirmation.mockRejectedValueOnce(new Error('delivery failed'));

		const response = await testServer
			.authAgentFor(owner)
			.post('/change-email')
			.send({ email: NEW_EMAIL, currentPassword: 'password' });

		expect(response.statusCode).toBe(500);
		expect(await emailInDb(owner.id)).toBe(owner.email);
	});

	test('should reject a target email already in use', async () => {
		await createUser({ email: 'taken@example.com' });

		const response = await testServer
			.authAgentFor(owner)
			.post('/change-email')
			.send({ email: 'taken@example.com', currentPassword: 'password' });

		expect(response.statusCode).toBe(400);
		expect(mailer.emailChangeConfirmation).not.toHaveBeenCalled();
	});

	test('should apply the change immediately when email delivery is not configured', async () => {
		Object.assign(mailer, { isEmailSetUp: false });

		const response = await testServer
			.authAgentFor(owner)
			.post('/change-email')
			.send({ email: NEW_EMAIL, currentPassword: 'password' });

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toEqual({
			status: 'changed',
			user: expect.objectContaining({ email: NEW_EMAIL }),
		});
		expect(await emailInDb(owner.id)).toBe(NEW_EMAIL);
		expect(getAuthToken(response)).toBeDefined();
	});
});

describe('GET /resolve-change-email-token', () => {
	test('should return the target email for a valid token', async () => {
		const token = tokenFor(owner, NEW_EMAIL);

		const response = await testServer.authlessAgent.get(
			`/resolve-change-email-token?token=${token}`,
		);

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toEqual({ email: NEW_EMAIL });
	});

	test('should return 404 for an invalid token', async () => {
		const response = await testServer.authlessAgent.get('/resolve-change-email-token?token=nope');

		expect(response.statusCode).toBe(404);
	});
});

describe('POST /confirm-email-change', () => {
	test('should apply the change, notify the old address, and issue no session cookie', async () => {
		const token = tokenFor(owner, NEW_EMAIL);

		const response = await testServer.authlessAgent.post('/confirm-email-change').send({ token });

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toEqual({ success: true });
		expect(await emailInDb(owner.id)).toBe(NEW_EMAIL);
		expect(mailer.emailChangeCompleted).toHaveBeenCalledWith(
			expect.objectContaining({ email: owner.email, newEmail: NEW_EMAIL }),
		);
		expect(getAuthToken(response)).toBeUndefined();
	});

	test('should return 404 for an invalid token', async () => {
		const response = await testServer.authlessAgent
			.post('/confirm-email-change')
			.send({ token: 'nope' });

		expect(response.statusCode).toBe(404);
	});

	test('should reject when the target email was taken after the token was issued', async () => {
		const token = tokenFor(owner, NEW_EMAIL);
		await createUser({ email: NEW_EMAIL });

		const response = await testServer.authlessAgent.post('/confirm-email-change').send({ token });

		expect(response.statusCode).toBe(400);
		expect(await emailInDb(owner.id)).toBe(owner.email);
	});

	test('should re-run the guards and reject when one now applies to the account', async () => {
		const ldapUser = await createLdapUser(
			{ email: 'ldap@example.com', role: GLOBAL_OWNER_ROLE },
			'ldap-id-1',
		);
		const token = tokenFor(ldapUser, NEW_EMAIL);
		await setCurrentAuthenticationMethod('ldap');

		try {
			const response = await testServer.authlessAgent.post('/confirm-email-change').send({ token });

			expect(response.statusCode).toBe(400);
			expect(await emailInDb(ldapUser.id)).toBe(ldapUser.email);
		} finally {
			await setCurrentAuthenticationMethod('email');
		}
	});
});
