import { randomEmail, randomString } from './shared/random';
import * as testDb from './shared/testDb';
import { setupTestServer } from './shared/utils/';
import type { PublicUser } from '@/Interfaces';
import config from '@/config';
import * as samlHelpers from '@/sso/saml/samlHelpers';
import { UserManagementMailer } from '@/UserManagement/email';
import * as utils from './shared/utils/';
import { ExternalHooks } from '@/ExternalHooks';
import * as Db from '@/Db';
import type { User } from '@/databases/entities/User';
import { InternalHooks } from '@/InternalHooks';
import { createOwner, createMember } from './shared/db/users';

const { any } = expect;

const testServer = setupTestServer({ endpointGroups: ['users'] });

const externalHooks = utils.mockInstance(ExternalHooks);
const mailer = utils.mockInstance(UserManagementMailer, { isEmailSetUp: true });
const internalHooks = utils.mockInstance(InternalHooks);

let owner: User;
let member: User;

beforeEach(async () => {
	await testDb.truncate(['User']);
	owner = await createOwner();
	member = await createMember();
	externalHooks.run.mockReset();
});

const validatePublicUser = (user: PublicUser) => {
	expect(typeof user.id).toBe('string');
	expect(user.email).toBeDefined();
	expect(user.firstName).toBeDefined();
	expect(user.lastName).toBeDefined();
	expect(typeof user.isOwner).toBe('boolean');
	expect(user.isPending).toBe(false);
	expect(user.signInType).toBe('email');
	expect(user.settings).toBe(null);
	expect(user.personalizationAnswers).toBeNull();
	expect(user.password).toBeUndefined();
	expect(user.globalRole).toBeDefined();
};

describe('GET /users', () => {
	test('should return all users', async () => {
		const response = await testServer.authAgentFor(owner).get('/users').expect(200);

		expect(response.body.data).toHaveLength(2);

		response.body.data.forEach(validatePublicUser);

		const _response = await testServer.authAgentFor(member).get('/users').expect(200);

		expect(_response.body.data).toHaveLength(2);

		_response.body.data.forEach(validatePublicUser);
	});

	describe('filter', () => {
		test('should filter users by field: email', async () => {
			const secondMember = await createMember();

			const response = await testServer
				.authAgentFor(owner)
				.get('/users')
				.query(`filter={ "email": "${secondMember.email}" }`)
				.expect(200);

			expect(response.body.data).toHaveLength(1);

			const [user] = response.body.data;

			expect(user.email).toBe(secondMember.email);

			const _response = await testServer
				.authAgentFor(owner)
				.get('/users')
				.query('filter={ "email": "non@existing.com" }')
				.expect(200);

			expect(_response.body.data).toHaveLength(0);
		});

		test('should filter users by field: firstName', async () => {
			const secondMember = await createMember();

			const response = await testServer
				.authAgentFor(owner)
				.get('/users')
				.query(`filter={ "firstName": "${secondMember.firstName}" }`)
				.expect(200);

			expect(response.body.data).toHaveLength(1);

			const [user] = response.body.data;

			expect(user.email).toBe(secondMember.email);

			const _response = await testServer
				.authAgentFor(owner)
				.get('/users')
				.query('filter={ "firstName": "Non-Existing" }')
				.expect(200);

			expect(_response.body.data).toHaveLength(0);
		});

		test('should filter users by field: lastName', async () => {
			const secondMember = await createMember();

			const response = await testServer
				.authAgentFor(owner)
				.get('/users')
				.query(`filter={ "lastName": "${secondMember.lastName}" }`)
				.expect(200);

			expect(response.body.data).toHaveLength(1);

			const [user] = response.body.data;

			expect(user.email).toBe(secondMember.email);

			const _response = await testServer
				.authAgentFor(owner)
				.get('/users')
				.query('filter={ "lastName": "Non-Existing" }')
				.expect(200);

			expect(_response.body.data).toHaveLength(0);
		});

		test('should filter users by computed field: isOwner', async () => {
			const response = await testServer
				.authAgentFor(owner)
				.get('/users')
				.query('filter={ "isOwner": true }')
				.expect(200);

			expect(response.body.data).toHaveLength(1);

			const [user] = response.body.data;

			expect(user.isOwner).toBe(true);

			const _response = await testServer
				.authAgentFor(owner)
				.get('/users')
				.query('filter={ "isOwner": false }')
				.expect(200);

			expect(_response.body.data).toHaveLength(1);

			const [_user] = _response.body.data;

			expect(_user.isOwner).toBe(false);
		});
	});

	describe('select', () => {
		test('should select user field: id', async () => {
			const response = await testServer
				.authAgentFor(owner)
				.get('/users')
				.query('select=["id"]')
				.expect(200);

			expect(response.body).toEqual({
				data: [{ id: any(String) }, { id: any(String) }],
			});
		});

		test('should select user field: email', async () => {
			const response = await testServer
				.authAgentFor(owner)
				.get('/users')
				.query('select=["email"]')
				.expect(200);

			expect(response.body).toEqual({
				data: [{ email: any(String) }, { email: any(String) }],
			});
		});

		test('should select user field: firstName', async () => {
			const response = await testServer
				.authAgentFor(owner)
				.get('/users')
				.query('select=["firstName"]')
				.expect(200);

			expect(response.body).toEqual({
				data: [{ firstName: any(String) }, { firstName: any(String) }],
			});
		});

		test('should select user field: lastName', async () => {
			const response = await testServer
				.authAgentFor(owner)
				.get('/users')
				.query('select=["lastName"]')
				.expect(200);

			expect(response.body).toEqual({
				data: [{ lastName: any(String) }, { lastName: any(String) }],
			});
		});
	});

	describe('take', () => {
		test('should return n users or less, without skip', async () => {
			const response = await testServer
				.authAgentFor(owner)
				.get('/users')
				.query('take=2')
				.expect(200);

			expect(response.body.data).toHaveLength(2);

			response.body.data.forEach(validatePublicUser);

			const _response = await testServer
				.authAgentFor(owner)
				.get('/users')
				.query('take=1')
				.expect(200);

			expect(_response.body.data).toHaveLength(1);

			_response.body.data.forEach(validatePublicUser);
		});

		test('should return n users or less, with skip', async () => {
			const response = await testServer
				.authAgentFor(owner)
				.get('/users')
				.query('take=1&skip=1')
				.expect(200);

			expect(response.body.data).toHaveLength(1);

			response.body.data.forEach(validatePublicUser);
		});
	});

	describe('combinations', () => {
		test('should support options that require auxiliary fields', async () => {
			// isOwner requires globalRole
			// id-less select with take requires id

			const response = await testServer
				.authAgentFor(owner)
				.get('/users')
				.query('filter={ "isOwner": true }&select=["firstName"]&take=10')
				.expect(200);

			expect(response.body).toEqual({ data: [{ firstName: any(String) }] });
		});
	});
});

describe('POST /users', () => {
	test('should error due to invalid input', async () => {
		const INVALID_INPUTS = [[{}], { email: randomString(1, 10) }];

		for (const [_, invalidInput] of INVALID_INPUTS.entries()) {
			const response = await testServer
				.authAgentFor(owner)
				.post('/users')
				.send(invalidInput)
				.expect(400);

			expect(response.body?.code).toBeDefined();
			expect(response.body?.message).toBeDefined();
			expect(response.body?.code).toBe(400);
		}
	});

	test('should fail due to SAML license enabled', async () => {
		jest.spyOn(samlHelpers, 'isSamlLicensedAndEnabled').mockImplementation(() => true);

		const response = await testServer
			.authAgentFor(owner)
			.post('/users')
			.send([{ email: randomEmail() }])
			.expect(400);

		expect(response.body?.code).toBeDefined();
		expect(response.body?.message).toBeDefined();
		expect(response.body?.code).toBe(400);
	});

	test('should fail due to license max users restriction', async () => {
		jest.spyOn(samlHelpers, 'isSamlLicensedAndEnabled').mockImplementation(() => true);

		const response = await testServer
			.authAgentFor(owner)
			.post('/users')
			.send([{ email: randomEmail() }])
			.expect(400);

		expect(response.body?.code).toBeDefined();
		expect(response.body?.message).toBeDefined();
		expect(response.body?.code).toBe(400);
	});

	test('should fail due to not owner setup', async () => {
		config.set('userManagement.isInstanceOwnerSetUp', false);

		const response = await testServer
			.authAgentFor(owner)
			.post('/users')
			.send([{ email: randomEmail() }])
			.expect(400);

		expect(response.body?.code).toBeDefined();
		expect(response.body?.message).toBeDefined();
		expect(response.body?.code).toBe(400);
	});

	//TODO - check that members cannot  use the invitation endpoint

	test.only('should invite member and "send" email', async () => {
		const email = randomEmail();

		jest.spyOn(mailer, 'invite').mockImplementation(async (data) => {
			return {
				emailSent: true,
			};
		});

		const response = await testServer
			.authAgentFor(owner)
			.post('/users')
			.send([{ email }])
			.expect(200);

		const user = await Db.collections.User.findOneByOrFail({ email });

		expect(internalHooks.onUserTransactionalEmail).toHaveBeenCalledTimes(1);
		const [onUserTransactionalEmailParameter] =
			internalHooks.onUserTransactionalEmail.mock.calls[0];
		expect(onUserTransactionalEmailParameter.user_id).toBe(user.id);
		expect(onUserTransactionalEmailParameter.message_type).toBe('New user invite');
		expect(onUserTransactionalEmailParameter.public_api).toBe(false);

		expect(internalHooks.onUserInvite).toHaveBeenCalledTimes(1);
		const [onUserInviteParameter] = internalHooks.onUserInvite.mock.calls[0];
		expect(onUserInviteParameter.user.id).toBe(owner.id);
		expect(onUserInviteParameter.target_user_id[0]).toBe(user.id);
		expect(onUserInviteParameter.public_api).toBe(false);
		expect(onUserInviteParameter.email_sent).toBe(true);

		expect(externalHooks.run).toHaveBeenCalledTimes(1);
		const [hookName, hookData] = externalHooks.run.mock.calls[0];
		expect(hookName).toBe('user.invited');
		expect(hookData[0][0]).toBe(email);

		expect(user.isOwner).toBe(false);
		expect(user.isPending).toBe(true);
		expect(user.firstName).toBe(null);
		expect(user.lastName).toBe(null);
		expect(user.password).toBe(null);

		expect(response.body?.data).toBeDefined();
		expect(response.body?.data).toBeInstanceOf(Array);
		expect(response.body?.data[0]?.user?.id).toBe(user.id);
		expect(response.body?.data[0]?.user?.email).toBe(user.email);
		expect(response.body?.data[0]?.user?.emailSent).toBe(true);

		const inviteUrl = new URL(response.body?.data[0]?.user?.inviteAcceptUrl);

		expect(inviteUrl.searchParams.get('inviterId')).toBe(owner.id);
		expect(inviteUrl.searchParams.get('inviteeId')).toBe(user.id);
	});
});
