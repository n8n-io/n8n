import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { CacheService, EventService } from '@n8n/backend-services';
import { testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { SettingsRepository, UserRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';

import { setSamlLoginEnabled } from '@/modules/sso-saml/saml-helpers';
import { setCurrentAuthenticationMethod } from '@/sso.ee/sso-helpers';
import { createAdmin, createMember, createOwner } from '@test-integration/db/users';
import * as utils from '@test-integration/utils';

import { SCIM_TOKEN_SETTINGS_KEY, ScimTokenRepository } from '../database/scim-token.repository';
import { ScimConnectionService } from '../scim-connection.service';
import { hashScimToken } from '../scim-token.service';
import { ScimSettingsService } from '../scim-settings.service';

const testServer = utils.setupTestServer({
	// `users` serves the role change and the deletion of the token creator.
	// `saml` serves the SAML login toggle.
	endpointGroups: ['users', 'module-settings', 'saml'],
	enabledFeatures: ['feat:scim', 'feat:advancedPermissions', 'feat:saml', 'feat:oidc'],
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

/** Turns on single sign-on the way a saved SAML or OIDC configuration does. */
const turnOnSso = async (protocol: 'saml' | 'oidc') => {
	const { sso } = Container.get(GlobalConfig);
	sso.saml.loginEnabled = protocol === 'saml';
	sso.oidc.loginEnabled = protocol === 'oidc';
	await setCurrentAuthenticationMethod(protocol);
};

beforeEach(async () => {
	await testDb.truncate(['ApiKey', 'AuthIdentity', 'ProjectRelation', 'Project', 'User']);
	await Container.get(SettingsRepository).delete({ key: SCIM_TOKEN_SETTINGS_KEY });

	// SCIM provisioning works only while SAML or OIDC single sign-on is on.
	await turnOnSso('saml');

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
			// Show-once: only POST /rest/scim/token returns the full value.
			expect(JSON.stringify(response.body.data)).not.toContain(token);
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

describe('SCIM connection status', () => {
	const config = async () => {
		const response = await testServer.authAgentFor(owner).get('/scim/config').expect(200);
		return response.body.data;
	};

	/**
	 * The status compares times in milliseconds, and a local request can take
	 * less than one. Two steps in the same millisecond have no order, so wait
	 * for the next millisecond before a step that must come later.
	 */
	const nextMillisecond = async () => {
		const start = Date.now();
		while (Date.now() <= start) await new Promise((resolve) => setTimeout(resolve, 1));
	};

	const rotate = async () => {
		const response = await testServer.authAgentFor(admin).post('/scim/token').expect(201);
		await nextMillisecond();
		return response.body.data.token as string;
	};

	// The requests of a test come after the token and the reset of `beforeEach`.
	beforeEach(async () => {
		await nextMillisecond();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('returns waiting and the creator for a new token', async () => {
		const data = await config();

		expect(data.status).toBe('waiting');
		expect(data.lastAuthFailure).toBeNull();
		expect(data.token).toEqual({
			createdAt: expect.any(String),
			createdBy: { id: admin.id, firstName: admin.firstName, lastName: admin.lastName },
			lastUsedAt: null,
		});
	});

	it('returns connected and the last use after a valid request', async () => {
		await scimRequest('get', '/Users').expect(200);

		const data = await config();

		expect(data.status).toBe('connected');
		expect(data.token.lastUsedAt).toEqual(expect.any(String));
		expect(Date.parse(data.token.lastUsedAt)).toBeGreaterThanOrEqual(
			Date.parse(data.token.createdAt),
		);
	});

	it('writes the last use once for many valid requests', async () => {
		const markUsed = vi.spyOn(scimTokenRepository(), 'markUsed');

		for (let i = 0; i < 10; i++) await scimRequest('get', '/Users').expect(200);

		expect(markUsed).toHaveBeenCalledTimes(1);
	});

	it('writes the failure once for many failed requests', async () => {
		const setLastAuthFailure = vi.spyOn(Container.get(ScimSettingsService), 'setLastAuthFailure');

		for (let i = 0; i < 10; i++) {
			await scimRequest('get', '/Users', { bearer: i % 2 ? 'not-a-scim-token' : null }).expect(401);
		}

		expect(setLastAuthFailure).toHaveBeenCalledTimes(1);
		expect((await config()).lastAuthFailure).toEqual({
			at: expect.any(String),
			reason: 'missing_header',
		});
	});

	it('returns error with superseded_token when the IdP sends the rotated token', async () => {
		const oldToken = token;
		await rotate();

		await scimRequest('get', '/Users', { bearer: oldToken }).expect(401);

		const data = await config();
		expect(data.lastAuthFailure).toEqual({ at: expect.any(String), reason: 'superseded_token' });
		expect(data.status).toBe('error');
	});

	it('returns superseded_token when the IdP sends a token that an admin revoked', async () => {
		const oldToken = token;
		await testServer.authAgentFor(admin).delete('/scim/token').expect(200);
		await rotate();

		await scimRequest('get', '/Users', { bearer: oldToken }).expect(401);

		const data = await config();
		expect(data.lastAuthFailure).toEqual({ at: expect.any(String), reason: 'superseded_token' });
		expect(data.status).toBe('error');
	});

	it('returns connected and keeps the failure when the IdP then sends the current token', async () => {
		const oldToken = token;
		const newToken = await rotate();
		await scimRequest('get', '/Users', { bearer: oldToken }).expect(401);

		await scimRequest('get', '/Users', { bearer: newToken }).expect(200);

		const data = await config();
		expect(data.status).toBe('connected');
		expect(data.lastAuthFailure).toMatchObject({ reason: 'superseded_token' });
	});

	it('returns connected after a failure between two valid requests in one minute', async () => {
		const oldToken = token;
		const newToken = await rotate();
		await scimRequest('get', '/Users', { bearer: newToken }).expect(200);
		await nextMillisecond();
		await scimRequest('get', '/Users', { bearer: oldToken }).expect(401);
		expect((await config()).status).toBe('error');

		await scimRequest('get', '/Users', { bearer: newToken }).expect(200);

		const data = await config();
		expect(data.status).toBe('connected');
		expect(data.lastAuthFailure).toMatchObject({ reason: 'superseded_token' });
	});

	// Each main has its own throttle state. The cache tells this main about
	// the failure write of the other main.
	it('returns connected after a failure on another main between two valid requests in one minute', async () => {
		const otherMain = new ScimConnectionService(
			Container.get(Logger),
			scimTokenRepository(),
			Container.get(ScimSettingsService),
			Container.get(CacheService),
		);
		await scimRequest('get', '/Users').expect(200);
		await nextMillisecond();
		await otherMain.recordAuthFailure('superseded_token');
		expect((await config()).status).toBe('error');

		await scimRequest('get', '/Users').expect(200);

		expect((await config()).status).toBe('connected');
	});

	// Any client can send these requests, so they must not change the status.
	it.each([
		['no token', null, 'missing_header'],
		['an unknown token', 'not-a-scim-token', 'invalid_token'],
		[
			'a token in the right format that the instance did not issue',
			`n8n_scim_${'a'.repeat(43)}`,
			'invalid_token',
		],
	])(
		'keeps connected when a request with %s follows a valid request',
		async (_, bearer, reason) => {
			await scimRequest('get', '/Users').expect(200);

			await scimRequest('get', '/Users', { bearer }).expect(401);

			const data = await config();
			expect(data.status).toBe('connected');
			expect(data.lastAuthFailure).toEqual({ at: expect.any(String), reason });
		},
	);

	// Another main stored the failure, so the throttle of this main does not skip the request.
	it('keeps an old-token failure when a request without a token follows', async () => {
		await scimRequest('get', '/Users').expect(200);
		const { lastUsedAt } = (await config()).token;
		const oldTokenFailure = {
			at: new Date(Date.parse(lastUsedAt) + 1000).toISOString(),
			reason: 'superseded_token',
		} as const;
		await Container.get(ScimSettingsService).setLastAuthFailure(oldTokenFailure);

		await scimRequest('get', '/Users', { bearer: null }).expect(401);

		const data = await config();
		expect(data.status).toBe('error');
		expect(data.lastAuthFailure).toEqual(oldTokenFailure);
	});

	it('clears the failure when an admin rotates the token', async () => {
		await scimRequest('get', '/Users', { bearer: 'not-a-scim-token' }).expect(401);
		expect((await config()).status).toBe('error');

		await rotate();

		const data = await config();
		expect(data.lastAuthFailure).toBeNull();
		expect(data.status).toBe('waiting');
	});

	// A failure write that started before the rotation can commit after it.
	it('does not store a failure from before the last rotation', async () => {
		const failedAt = new Date().toISOString();
		await rotate();

		const stored = await Container.get(ScimSettingsService).setLastAuthFailure({
			at: failedAt,
			reason: 'superseded_token',
		});

		expect((await config()).lastAuthFailure).toBeNull();
		expect(stored).toBe(false);
	});

	it('clears the failure when an admin turns SCIM on', async () => {
		await scimRequest('get', '/Users', { bearer: null }).expect(401);
		const agent = testServer.authAgentFor(admin);
		await agent.patch('/scim/config').send({ enabled: false }).expect(200);

		await agent.patch('/scim/config').send({ enabled: true }).expect(200);

		expect((await config()).lastAuthFailure).toBeNull();
	});

	it('does not record a failure when a SCIM operation returns 409', async () => {
		const body = { schemas: [USER_SCHEMA], userName: 'twice@example.com' };
		await scimRequest('post', '/Users', { body }).expect(201);

		await scimRequest('post', '/Users', { body }).expect(409);

		const data = await config();
		expect(data.lastAuthFailure).toBeNull();
		expect(data.status).toBe('connected');
	});

	it('does not record a failure while SCIM is disabled', async () => {
		await Container.get(ScimSettingsService).setEnabled(false);

		await scimRequest('get', '/Users', { bearer: 'not-a-scim-token' }).expect(403);
		await scimRequest('get', '/Users', { bearer: null }).expect(403);

		expect((await config()).lastAuthFailure).toBeNull();
	});

	it('returns no creator after the creator is deleted', async () => {
		await testServer.authAgentFor(owner).delete(`/users/${admin.id}`).expect(200);

		expect((await config()).token).toMatchObject({ createdBy: null });
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

describe('SCIM-managed users', () => {
	const listUsers = async () => {
		const response = await testServer.authAgentFor(admin).get('/users').expect(200);
		return response.body.data.items as Array<{
			id: string;
			disabled: boolean;
			isScimManaged: boolean;
		}>;
	};

	const listedUser = async (id: string) => (await listUsers()).find((user) => user.id === id);

	const provision = async (userName: string, active = true) => {
		const response = await scimRequest('post', '/Users', {
			body: { schemas: [USER_SCHEMA], userName, active },
		}).expect(201);
		return response.body.id as string;
	};

	const setActive = async (id: string, active: boolean) =>
		await scimRequest('patch', `/Users/${id}`, {
			body: patchOps({ op: 'replace', path: 'active', value: active }),
		}).expect(200);

	const moduleSettings = async () => {
		const response = await testServer.authAgentFor(admin).get('/module-settings').expect(200);
		return response.body.data.scim;
	};

	const config = async () => {
		const response = await testServer.authAgentFor(owner).get('/scim/config').expect(200);
		return response.body.data;
	};

	it('marks a user that SCIM creates and no other user', async () => {
		const member = await createMember();

		const id = await provision('provisioned@example.com');

		const users = await listUsers();
		expect(users.find((user) => user.id === id)).toMatchObject({ isScimManaged: true });
		for (const other of [owner, admin, member]) {
			expect(users.find((user) => user.id === other.id)).toMatchObject({ isScimManaged: false });
		}
	});

	// The identity provider finds an existing user with a `userName` filter
	// and then manages that user.
	it.each([
		['a PATCH', async (user: User) => await setActive(user.id, false)],
		[
			'a PATCH that changes no field',
			async (user: User) =>
				await scimRequest('patch', `/Users/${user.id}`, {
					body: patchOps({ op: 'replace', path: 'active', value: true }),
				}).expect(200),
		],
		[
			'a PUT',
			async (user: User) =>
				await scimRequest('put', `/Users/${user.id}`, {
					body: { schemas: [USER_SCHEMA], userName: user.email },
				}).expect(200),
		],
		[
			'a DELETE',
			async (user: User) => await scimRequest('delete', `/Users/${user.id}`).expect(204),
		],
	])('marks a user that SCIM did not create after %s', async (_, write) => {
		const member = await createMember();
		expect((await reload(member.id)).isScimManaged).toBe(false);

		await write(member);

		expect(await listedUser(member.id)).toMatchObject({ isScimManaged: true });
	});

	it('does not mark a user that SCIM only reads', async () => {
		const member = await createMember();

		await scimRequest('get', `/Users?filter=userName eq "${member.email}"`).expect(200);
		await scimRequest('get', `/Users/${member.id}`).expect(200);

		expect(await listedUser(member.id)).toMatchObject({ isScimManaged: false });
	});

	it('does not mark the owner after a SCIM write', async () => {
		await scimRequest('patch', `/Users/${owner.id}`, {
			body: patchOps({ op: 'replace', path: 'name.givenName', value: 'Renamed' }),
		}).expect(200);
		await scimRequest('put', `/Users/${owner.id}`, {
			body: { schemas: [USER_SCHEMA], userName: owner.email },
		}).expect(200);
		await scimRequest('delete', `/Users/${owner.id}`).expect(403);

		expect(await listedUser(owner.id)).toMatchObject({ isScimManaged: false });
	});

	it.each([
		[
			'a PATCH',
			async (user: User, takenEmail: string) =>
				await scimRequest('patch', `/Users/${user.id}`, {
					body: patchOps({ op: 'replace', path: 'userName', value: takenEmail }),
				}),
		],
		[
			'a PUT',
			async (user: User, takenEmail: string) =>
				await scimRequest('put', `/Users/${user.id}`, {
					body: { schemas: [USER_SCHEMA], userName: takenEmail },
				}),
		],
	])('does not mark a user after %s that returns 409', async (_, write) => {
		const member = await createMember();
		const other = await createMember();

		const response = await write(member, other.email);

		expect(response.status).toBe(409);
		expect(await reload(member.id)).toMatchObject({ email: member.email, isScimManaged: false });
	});

	it('shows the deactivation and the reactivation from the identity provider', async () => {
		const id = await provision('deactivated@example.com');

		await setActive(id, false);
		expect(await listedUser(id)).toMatchObject({ disabled: true, isScimManaged: true });

		await setActive(id, true);
		expect(await listedUser(id)).toMatchObject({ disabled: false, isScimManaged: true });
	});

	it('returns the number of provisioned and deactivated users in the SCIM config', async () => {
		await createMember();
		// Deactivated outside SCIM, so the counts do not include this user.
		const disabledMember = await createMember();
		await Container.get(UserRepository).update(disabledMember.id, { disabled: true });
		await provision('first@example.com');
		await provision('second@example.com');
		await provision('inactive@example.com', false);

		expect(await config()).toMatchObject({ provisionedCount: 3, deactivatedCount: 1 });
	});

	it('counts a user that SCIM did not create after the identity provider deactivates it', async () => {
		const member = await createMember();
		await provision('provisioned@example.com');

		await setActive(member.id, false);

		expect(await config()).toMatchObject({ provisionedCount: 2, deactivatedCount: 1 });
	});

	it('shows SCIM enabled and the token in the module settings until the token is revoked', async () => {
		await Container.get(ModuleRegistry).refreshModuleSettings('scim');
		expect(await moduleSettings()).toMatchObject({ scimEnabled: true, hasToken: true });

		await testServer.authAgentFor(admin).delete('/scim/token').expect(200);
		expect(await moduleSettings()).toMatchObject({ scimEnabled: true, hasToken: false });

		await testServer.authAgentFor(admin).post('/scim/token').expect(201);
		expect(await moduleSettings()).toMatchObject({ hasToken: true });
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

describe('SCIM and single sign-on', () => {
	const scimSettings = () => Container.get(ScimSettingsService);

	const moduleSettings = async () => {
		const response = await testServer.authAgentFor(admin).get('/module-settings').expect(200);
		return response.body.data.scim;
	};

	const toggleSamlLogin = async (loginEnabled: boolean) =>
		await testServer
			.authAgentFor(owner)
			.post('/sso/saml/config/toggle')
			.send({ loginEnabled })
			.expect(200);

	// SCIM turns off before the toggle returns.
	const expectScimOff = async () => expect(await scimSettings().isEnabled()).toBe(false);

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('returns 400 and keeps SCIM off when an admin enables SCIM without single sign-on', async () => {
		await scimSettings().setEnabled(false);
		await setCurrentAuthenticationMethod('email');

		const response = await testServer
			.authAgentFor(admin)
			.patch('/scim/config')
			.send({ enabled: true });

		expect(response.status).toBe(400);
		expect(await scimSettings().isEnabled()).toBe(false);
	});

	// Another main can turn single sign-on off and save the method before this
	// main reloads it. The enable check reads the saved method under the lock.
	it('returns 400 and keeps SCIM off when the saved method is email but this main still says SAML', async () => {
		await scimSettings().setEnabled(false);
		await turnOnSso('saml');
		await Container.get(SettingsRepository).upsertByKey(
			'userManagement.authenticationMethod',
			'email',
			true,
			{},
		);

		const response = await testServer
			.authAgentFor(admin)
			.patch('/scim/config')
			.send({ enabled: true });

		expect(response.status).toBe(400);
		expect(await scimSettings().isEnabled()).toBe(false);
	});

	it('returns 400 while LDAP is the authentication method', async () => {
		await scimSettings().setEnabled(false);
		await setCurrentAuthenticationMethod('ldap');

		await testServer.authAgentFor(admin).patch('/scim/config').send({ enabled: true }).expect(400);
	});

	it('lets an admin turn SCIM off without single sign-on', async () => {
		await setCurrentAuthenticationMethod('email');

		await testServer.authAgentFor(admin).patch('/scim/config').send({ enabled: false }).expect(200);

		expect(await scimSettings().isEnabled()).toBe(false);
	});

	it.each(['saml', 'oidc'] as const)(
		'enables SCIM while %s is on and shows it in the module settings',
		async (protocol) => {
			await scimSettings().setEnabled(false);
			await Container.get(ModuleRegistry).refreshModuleSettings('scim');
			await turnOnSso(protocol);

			await testServer
				.authAgentFor(admin)
				.patch('/scim/config')
				.send({ enabled: true })
				.expect(200);

			expect(await moduleSettings()).toMatchObject({ scimEnabled: true });
		},
	);

	it('turns SCIM off and keeps the token when an admin turns SAML login off', async () => {
		const emit = vi.spyOn(Container.get(EventService), 'emit');

		await toggleSamlLogin(false);

		await expectScimOff();
		expect(emit).toHaveBeenCalledWith('sso-login-disabled', {
			protocol: 'saml',
			scimWasEnabled: true,
		});
		expect(await scimTokenRepository().findInstanceToken({})).toMatchObject({
			tokenHash: hashScimToken(token),
		});
		await vi.waitFor(async () =>
			expect(await moduleSettings()).toMatchObject({ scimEnabled: false }),
		);
		const response = await testServer.authAgentFor(admin).get('/scim/config').expect(200);
		expect(response.body.data).toMatchObject({ enabled: false, hasToken: true });
	});

	// An enable can commit while the cache still says off. The cascade and
	// the event read the saved switch, so SCIM still ends off, and the event
	// reports that SCIM was on.
	it('turns SCIM off when the cache says off and the saved switch says on', async () => {
		await Container.get(CacheService).set('scim.provisioning.enabled', 'false');
		const emit = vi.spyOn(Container.get(EventService), 'emit');

		await toggleSamlLogin(false);

		expect(emit).toHaveBeenCalledWith('sso-login-disabled', {
			protocol: 'saml',
			scimWasEnabled: true,
		});

		await vi.waitFor(async () =>
			expect(
				await Container.get(SettingsRepository).findByKey('scim.provisioning.enabled'),
			).toMatchObject({ value: 'false' }),
		);
	});

	// A silent failure leaves SCIM on, and SCIM serves again when SAML turns
	// on again. The toggle fails, so the admin knows that SCIM is still on.
	// The steps in the message then turn SCIM and single sign-on off.
	it('fails the SAML toggle and rejects SCIM requests when SCIM does not turn off', async () => {
		const turnOff = vi.spyOn(scimSettings(), 'turnOff').mockRejectedValue(new Error('db down'));

		const response = await testServer
			.authAgentFor(owner)
			.post('/sso/saml/config/toggle')
			.send({ loginEnabled: false });

		expect(response.status).toBe(500);
		expect(response.body.message).toBe(
			'SCIM provisioning did not turn off, so single sign-on did not turn off fully. Turn off SCIM provisioning in the SCIM settings. Then turn off single sign-on again.',
		);
		expect(await scimSettings().isEnabled()).toBe(true);
		await scimRequest('get', '/Users').expect(403);

		turnOff.mockRestore();
		await testServer.authAgentFor(admin).patch('/scim/config').send({ enabled: false }).expect(200);
		await toggleSamlLogin(false);

		await expectScimOff();
		await scimRequest('get', '/Users').expect(403);
	});

	it('keeps SCIM off when SAML turns on again, and the old token works once an admin enables SCIM', async () => {
		await toggleSamlLogin(false);
		await expectScimOff();

		await setSamlLoginEnabled(true);

		expect(await scimSettings().isEnabled()).toBe(false);
		await scimRequest('get', '/Users').expect(403);

		await testServer.authAgentFor(admin).patch('/scim/config').send({ enabled: true }).expect(200);

		await scimRequest('get', '/Users').expect(200);
	});

	it('returns a SCIM 403 when single sign-on turns off without the cascade', async () => {
		testServer.license.disable('feat:saml');

		const response = await scimRequest('get', '/Users');

		expect(response.status).toBe(403);
		expect(response.body).toMatchObject({
			schemas: [ERROR_SCHEMA],
			status: '403',
			detail: 'SCIM provisioning requires SAML or OIDC single sign-on',
		});
		expect(await scimSettings().isEnabled()).toBe(true);
		expect(await scimSettings().getLastAuthFailure()).toBeNull();
	});
});
