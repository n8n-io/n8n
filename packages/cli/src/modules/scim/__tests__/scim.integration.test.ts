import { testDb } from '@n8n/backend-test-utils';
import { SettingsRepository, UserRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';

import { createAdmin, createMember, createOwner } from '@test-integration/db/users';
import * as utils from '@test-integration/utils';

import { SCIM_TOKEN_SETTINGS_KEY, ScimTokenRepository } from '../database/scim-token.repository';
import { hashScimToken } from '../scim-token.service';
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
	await Container.get(SettingsRepository).delete({ key: SCIM_TOKEN_SETTINGS_KEY });

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
		// The token keeps the ID of its deleted creator.
		expect(await scimTokenRepository().findInstanceToken({})).toMatchObject({
			tokenHash: hashScimToken(token),
			createdById: admin.id,
		});
	});

	it('lets another admin rotate the token', async () => {
		const otherAdmin = await createAdmin();

		const response = await tokenRequest(otherAdmin).expect(201);
		const newToken: string = response.body.data.token;

		expect(newToken).not.toBe(token);
		expect((await scimRequest('get', '/Users')).status).toBe(401);
		expect((await scimRequest('get', '/Users', { bearer: newToken })).status).toBe(200);
		expect(await scimTokenRepository().findInstanceToken({})).toMatchObject({
			tokenHash: hashScimToken(newToken),
			createdById: otherAdmin.id,
		});
	});

	it('lets another admin revoke the token', async () => {
		await testServer.authAgentFor(owner).delete('/scim/token').expect(200);

		expect((await scimRequest('get', '/Users')).status).toBe(401);
		const response = await testServer.authAgentFor(admin).get('/scim/config').expect(200);
		expect(response.body.data).toMatchObject({ hasToken: false, tokenHint: null });
	});

	it.each([
		['replace the same token', 'token'],
		['create the first token after a revoke', 'revoked'],
		['create the first token on an instance that never had one', 'none'],
	])('accepts one of two rotations that %s and returns 409 to the other', async (_, start) => {
		if (start === 'revoked') await testServer.authAgentFor(admin).delete('/scim/token').expect(200);
		if (start === 'none') {
			await Container.get(SettingsRepository).delete({ key: SCIM_TOKEN_SETTINGS_KEY });
		}
		// Both requests read the token state before either one writes it.
		const seen = await scimTokenRepository().findInstanceToken({});
		const staleRead = vi.spyOn(scimTokenRepository(), 'findInstanceToken').mockResolvedValue(seen);

		const responses = await Promise.all([tokenRequest(admin), tokenRequest(owner)]);
		staleRead.mockRestore();

		expect(responses.map(({ status }) => status).sort()).toEqual([201, 409]);
		const winner = responses.find(({ status }) => status === 201);
		const bearer: string = winner?.body.data.token;
		expect(await scimTokenRepository().findInstanceToken({})).toMatchObject({
			tokenHash: hashScimToken(bearer),
		});
		expect((await scimRequest('get', '/Users', { bearer })).status).toBe(200);
	});

	it('returns 401 for a token in the right format that the instance did not issue', async () => {
		const otherToken = `n8n_scim_${'A'.repeat(39)}${token.slice(-4)}`;

		expect((await scimRequest('get', '/Users', { bearer: otherToken })).status).toBe(401);
	});

	it('issues a random token with a recognizable prefix', () => {
		expect(token).toMatch(/^n8n_scim_[\w-]{43}$/);
	});

	// Show-once: no code path needs the value, so a database read must not give a working token.
	it('stores only a hash and the last four characters of the token', async () => {
		const row = await Container.get(SettingsRepository).findByKey(SCIM_TOKEN_SETTINGS_KEY);

		expect(row).toMatchObject({ loadOnStartup: false });
		expect(row?.value).not.toContain(token);
		expect(jsonParse(row?.value ?? '')).toMatchObject({
			current: { tokenHash: hashScimToken(token), tokenHint: token.slice(-4) },
		});
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
