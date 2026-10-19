import { JwtService } from '@n8n/backend-services';
import { testDb } from '@n8n/backend-test-utils';
import { UserRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { getApiKeyScopesForRole } from '@n8n/permissions';

import { PublicApiKeyService } from '@/services/public-api-key.service';
import { createAdmin, createMember, createOwner } from '@test-integration/db/users';
import * as utils from '@test-integration/utils';

import { ScimTokenRepository } from '../database/scim-token.repository';
import { ScimSettingsService } from '../scim-settings.service';

const testServer = utils.setupTestServer({
	// `users` serves the role change and the deletion of the token creator.
	endpointGroups: ['users'],
	enabledFeatures: ['feat:scim', 'feat:advancedPermissions'],
	modules: ['scim'],
});

const SCIM_JSON = 'application/scim+json';
const ERROR_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:Error';
const USER_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:User';
const PATCH_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:PatchOp';

let owner: User;
let admin: User;
let token: string;

const scimRequest = (
	method: 'get' | 'post' | 'put' | 'patch' | 'delete',
	path: string,
	{ body, bearer = token }: { body?: object; bearer?: string | null } = {},
) => {
	// supertest listens on a new port for each request. When the OS hands out a
	// port again, a pooled keep-alive socket to the closed server fails with
	// ECONNRESET, so do not pool.
	const request = testServer.restlessAgent[method](`/scim/v2${path}`).set('Connection', 'close');
	if (bearer !== null) void request.set('Authorization', `Bearer ${bearer}`);
	if (body) void request.set('Content-Type', SCIM_JSON).send(JSON.stringify(body));
	return request;
};

const patchOps = (...Operations: Array<{ op: string; path?: string; value?: unknown }>) => ({
	schemas: [PATCH_SCHEMA],
	Operations,
});

const reload = async (id: string) =>
	await Container.get(UserRepository).findOneOrFail({ where: { id }, relations: ['role'] });

const scimTokenRepository = () => Container.get(ScimTokenRepository);

beforeEach(async () => {
	await testDb.truncate(['ApiKey', 'AuthIdentity', 'ProjectRelation', 'Project', 'User']);
	await scimTokenRepository().delete({});

	owner = await createOwner();
	admin = await createAdmin();

	const response = await testServer.authAgentFor(admin).post('/scim/token').expect(201);
	token = response.body.data.token;

	await Container.get(ScimSettingsService).setEnabled(true);
});

describe('SCIM /scim/v2 authentication', () => {
	const routes = [
		['get', '/Users'],
		['get', '/Users/some-id'],
		['post', '/Users'],
		['put', '/Users/some-id'],
		['patch', '/Users/some-id'],
		['delete', '/Users/some-id'],
		['get', '/ServiceProviderConfig'],
		['get', '/ResourceTypes'],
		['get', '/Schemas'],
	] as const;

	it.each(routes)('%s %s returns 401 without a token', async (method, path) => {
		const response = await scimRequest(method, path, { bearer: null });

		expect(response.status).toBe(401);
		expect(response.body).toMatchObject({ schemas: [ERROR_SCHEMA], status: '401' });
	});

	it.each(routes)('%s %s returns 401 with an unknown token', async (method, path) => {
		const response = await scimRequest(method, path, { bearer: 'not-a-scim-token' });

		expect(response.status).toBe(401);
	});

	it.each(routes)('%s %s returns 403 when SCIM is disabled', async (method, path) => {
		await Container.get(ScimSettingsService).setEnabled(false);

		const response = await scimRequest(method, path);

		expect(response.status).toBe(403);
		expect(response.body).toMatchObject({ schemas: [ERROR_SCHEMA], status: '403' });
	});
});

describe('SCIM instance token', () => {
	const tokenRequest = (user: User) => testServer.authAgentFor(user).post('/scim/token');

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('shows every user with scim:manage the same token', async () => {
		const otherAdmin = await createAdmin();

		for (const user of [otherAdmin, owner]) {
			const response = await testServer.authAgentFor(user).get('/scim/config').expect(200);

			expect(response.body.data).toMatchObject({ hasToken: true, tokenHint: token.slice(-4) });
			expect(response.body.data).not.toHaveProperty('token');
		}
	});

	it('returns 403 to a member on every token route', async () => {
		const member = await createMember();
		const agent = testServer.authAgentFor(member);

		await agent.get('/scim/config').expect(403);
		await agent.post('/scim/token').expect(403);
		await agent.delete('/scim/token').expect(403);
		expect((await scimRequest('get', '/Users')).status).toBe(200);
	});

	it('keeps the token working after its creator is disabled', async () => {
		await Container.get(UserRepository).update({ id: admin.id }, { disabled: true });

		expect((await scimRequest('get', '/Users')).status).toBe(200);
	});

	it('keeps the token working after its creator loses scim:manage', async () => {
		await testServer
			.authAgentFor(owner)
			.patch(`/users/${admin.id}/role`)
			.send({ newRoleName: 'global:member' })
			.expect(200);

		expect((await scimRequest('get', '/Users')).status).toBe(200);
	});

	it('keeps the token working after its creator is deleted', async () => {
		await testServer.authAgentFor(owner).delete(`/users/${admin.id}`).expect(200);

		expect((await scimRequest('get', '/Users')).status).toBe(200);
		expect(await scimTokenRepository().findInstanceToken({})).toMatchObject({
			createdById: null,
		});
	});

	it('lets another admin rotate the token', async () => {
		const otherAdmin = await createAdmin();

		const response = await tokenRequest(otherAdmin).expect(201);
		const newToken: string = response.body.data.token;

		expect(newToken).not.toBe(token);
		expect((await scimRequest('get', '/Users')).status).toBe(401);
		expect((await scimRequest('get', '/Users', { bearer: newToken })).status).toBe(200);
		expect(await scimTokenRepository().count()).toBe(1);
	});

	it('lets another admin revoke the token', async () => {
		await testServer.authAgentFor(owner).delete('/scim/token').expect(200);

		expect((await scimRequest('get', '/Users')).status).toBe(401);
		const response = await testServer.authAgentFor(admin).get('/scim/config').expect(200);
		expect(response.body.data).toMatchObject({ hasToken: false, tokenHint: null });
	});

	it.each([
		['replace the same token', true],
		['create the first token', false],
	])('accepts one of two rotations that %s and returns 409 to the other', async (_, withToken) => {
		if (!withToken) await testServer.authAgentFor(admin).delete('/scim/token').expect(200);
		// Both requests read the token state before either one writes it.
		const seen = await scimTokenRepository().findInstanceToken({});
		vi.spyOn(scimTokenRepository(), 'findInstanceToken').mockResolvedValue(seen);

		const responses = await Promise.all([tokenRequest(admin), tokenRequest(owner)]);

		expect(responses.map(({ status }) => status).sort()).toEqual([201, 409]);
		expect(await scimTokenRepository().count()).toBe(1);
		const winner = responses.find(({ status }) => status === 201);
		const bearer: string = winner?.body.data.token;
		expect((await scimRequest('get', '/Users', { bearer })).status).toBe(200);
	});

	it('creates the token for a user with a public API key of the former SCIM label', async () => {
		await testServer.authAgentFor(admin).delete('/scim/token').expect(200);
		await Container.get(PublicApiKeyService).createPublicApiKeyForUser(admin, {
			label: 'SCIM Provisioning API Key',
			expiresAt: null,
			scopes: getApiKeyScopesForRole(admin),
		});

		await tokenRequest(admin).expect(201);
	});

	it('accepts a stored token that has a user as its subject', async () => {
		// Tokens from before the instance token name their creator as subject.
		const legacyToken = Container.get(JwtService).sign('scimApiKey', {
			sub: admin.id,
			iss: 'n8n',
			jti: 'legacy-token',
		});
		const current = await scimTokenRepository().findInstanceToken({});
		await scimTokenRepository().replace(current?.token ?? null, legacyToken, admin.id, {});

		expect((await scimRequest('get', '/Users', { bearer: legacyToken })).status).toBe(200);
	});
});

describe('SCIM /scim/v2/Users', () => {
	it('creates a member, ignores roles and returns a Location header', async () => {
		const response = await scimRequest('post', '/Users', {
			body: {
				schemas: [USER_SCHEMA],
				userName: 'New.User@Example.com',
				name: { givenName: 'New', familyName: 'User' },
				roles: [{ value: 'global:admin', primary: true }],
			},
		}).expect(201);

		expect(response.headers.location).toBe(response.body.meta.location);
		expect(response.headers.location).toMatch(new RegExp(`/scim/v2/Users/${response.body.id}$`));
		expect(response.body).not.toHaveProperty('roles');
		expect(response.body.active).toBe(true);

		const created = await reload(response.body.id);
		expect(created.email).toBe('new.user@example.com');
		expect(created.role.slug).toBe('global:member');
		expect(created.disabled).toBe(false);
	});

	it('ignores roles on replace and patch', async () => {
		const member = await createMember();

		await scimRequest('put', `/Users/${member.id}`, {
			body: {
				schemas: [USER_SCHEMA],
				userName: member.email,
				roles: [{ value: 'global:admin' }],
			},
		}).expect(200);
		await scimRequest('patch', `/Users/${member.id}`, {
			body: patchOps(
				{ op: 'replace', path: 'roles', value: [{ value: 'global:admin' }] },
				{ op: 'add', value: { roles: [{ value: 'global:admin' }] } },
			),
		}).expect(200);

		expect((await reload(member.id)).role.slug).toBe('global:member');
	});

	it('keeps a disabled user disabled when PUT omits active', async () => {
		const member = await createMember();
		await Container.get(UserRepository).update({ id: member.id }, { disabled: true });

		const response = await scimRequest('put', `/Users/${member.id}`, {
			body: { schemas: [USER_SCHEMA], userName: member.email, name: { givenName: 'Renamed' } },
		}).expect(200);

		expect(response.body.active).toBe(false);
		const updated = await reload(member.id);
		expect(updated.disabled).toBe(true);
		expect(updated.firstName).toBe('Renamed');
	});

	it.each([
		['DELETE', async (id: string) => await scimRequest('delete', `/Users/${id}`).expect(204)],
		[
			'PATCH active false',
			async (id: string) =>
				await scimRequest('patch', `/Users/${id}`, {
					body: patchOps({ op: 'replace', path: 'active', value: false }),
				}).expect(200),
		],
	])('%s disables the user and keeps it', async (_, deprovision) => {
		const member = await createMember();

		await deprovision(member.id);

		expect((await reload(member.id)).disabled).toBe(true);
	});

	it('returns no resources but the full total for count=0', async () => {
		await createMember();

		const response = await scimRequest('get', '/Users?count=0').expect(200);

		expect(response.body.Resources).toEqual([]);
		expect(response.body.itemsPerPage).toBe(0);
		expect(response.body.totalResults).toBe(3);
	});

	describe('owner guard', () => {
		const expectOwnerUnchanged = async () => {
			const current = await reload(owner.id);
			expect(current.email).toBe(owner.email);
			expect(current.disabled).toBe(false);
			expect(current.role.slug).toBe('global:owner');
		};

		it.each([
			['userName', patchOps({ op: 'replace', path: 'userName', value: 'taken@example.com' })],
			[
				'a work email',
				patchOps({
					op: 'replace',
					path: 'emails[type eq "work"].value',
					value: 'taken@example.com',
				}),
			],
			['active false', patchOps({ op: 'replace', path: 'active', value: false })],
		])('rejects a PATCH of %s on the owner', async (_, body) => {
			const response = await scimRequest('patch', `/Users/${owner.id}`, { body });

			expect(response.status).toBe(403);
			expect(response.body).toMatchObject({ schemas: [ERROR_SCHEMA], status: '403' });
			await expectOwnerUnchanged();
		});

		it.each([
			['a new userName', { userName: 'taken@example.com' }],
			['active false', { active: false }],
		])('rejects a PUT with %s on the owner', async (_, over) => {
			const response = await scimRequest('put', `/Users/${owner.id}`, {
				body: { schemas: [USER_SCHEMA], userName: owner.email, ...over },
			});

			expect(response.status).toBe(403);
			await expectOwnerUnchanged();
		});

		it('rejects a DELETE of the owner', async () => {
			const response = await scimRequest('delete', `/Users/${owner.id}`);

			expect(response.status).toBe(403);
			expect(response.body).toMatchObject({ schemas: [ERROR_SCHEMA], status: '403' });
			await expectOwnerUnchanged();
		});
	});
});

describe('SCIM /scim/v2/Schemas', () => {
	it('lists the User schema without roles and with the Schema schema id', async () => {
		const response = await scimRequest('get', '/Schemas').expect(200);

		const [user] = response.body.Resources;
		expect(user.schemas).toEqual(['urn:ietf:params:scim:schemas:core:2.0:Schema']);
		expect(user.attributes.map((attribute: { name: string }) => attribute.name)).not.toContain(
			'roles',
		);
	});
});
