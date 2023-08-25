import * as testDb from './shared/testDb';
import { setupTestServer } from './shared/utils/';
import type { User } from '@/databases/entities/User';
import type { PublicUser } from '@/Interfaces';

const { any } = expect;

const testServer = setupTestServer({ endpointGroups: ['users'] });

let owner: User;
let member: User;

beforeEach(async () => {
	await testDb.truncate(['User']);
	owner = await testDb.createOwner();
	member = await testDb.createMember();
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
			const secondMember = await testDb.createMember();

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
			const secondMember = await testDb.createMember();

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
			const secondMember = await testDb.createMember();

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
