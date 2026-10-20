// The OIDC sign-in test replaces the calls to the identity provider.
const openidClient = vi.hoisted(() => ({
	discovery: vi.fn(),
	authorizationCodeGrant: vi.fn(),
	fetchUserInfo: vi.fn(),
}));

vi.mock('openid-client', async () => ({
	...(await vi.importActual<typeof import('openid-client')>('openid-client')),
	...openidClient,
}));

import { SCIM_N8N_USER_SCHEMA, SCIM_OPT_IN_FLAG, type OidcConfigDto } from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
import { EventService, JwtService } from '@n8n/backend-services';
import {
	createTeamProject,
	createWorkflow,
	getPersonalProject,
	linkUserToProject,
	randomCredentialPayload,
	shareWorkflowWithProjects,
	testDb,
} from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import {
	AuthIdentityRepository,
	CredentialsRepository,
	GLOBAL_MEMBER_ROLE,
	ProjectRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	UserRepository,
	WorkflowRepository,
	type User,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { getApiKeyScopesForRole } from '@n8n/permissions';
import { DataSource } from '@n8n/typeorm';
import type express from 'express';

import { ProvisioningService } from '@/modules/provisioning.ee/provisioning.service.ee';
import { OidcService } from '@/modules/sso-oidc/oidc.service.ee';
import { setSamlLoginEnabled } from '@/modules/sso-saml/saml-helpers';
import { SamlService } from '@/modules/sso-saml/saml.service.ee';
import { PostHogClient } from '@/posthog';
import { PublicApiKeyService } from '@/services/public-api-key.service';
import { INVITE_ROLE_MANAGED_MESSAGE } from '@/services/user.service';
import { setCurrentAuthenticationMethod } from '@/sso.ee/sso-helpers';
import { saveCredential } from '@test-integration/db/credentials';
import {
	addApiKey,
	createAdmin,
	createChatUser,
	createManyUsers,
	createMember,
	createOwner,
	createUserShell,
} from '@test-integration/db/users';
import * as utils from '@test-integration/utils';

import { ScimTokenRepository } from '../database/scim-token.repository';
import { ScimTransferTargetRepository } from '../database/scim-transfer-target.repository';
import {
	isValidScimTransferTarget,
	ScimDeprovisioningService,
} from '../scim-deprovisioning.service';
import { ScimOptInService } from '../scim-opt-in.service';
import { hashScimToken } from '../scim-token.service';
import { DEFAULT_SCIM_DEPROVISIONING_POLICY, ScimSettingsService } from '../scim-settings.service';
import { ScimConfig } from '../scim.config';

const testServer = utils.setupTestServer({
	// `users` serves the role change and the deletion of the token creator.
	// `saml` serves the SAML login toggle. `invitations` and `publicApi` serve
	// the manual invites.
	endpointGroups: ['users', 'module-settings', 'saml', 'invitations', 'publicApi'],
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

const scimRoutes = [
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

const instanceFlag = () => vi.mocked(Container.get(PostHogClient).getFeatureFlagForInstance);

const scimTokenRepository = () => Container.get(ScimTokenRepository);

/** Turns on single sign-on the way a saved SAML or OIDC configuration does. */
const turnOnSso = async (protocol: 'saml' | 'oidc') => {
	const { sso } = Container.get(GlobalConfig);
	sso.saml.loginEnabled = protocol === 'saml';
	sso.oidc.loginEnabled = protocol === 'oidc';
	await setCurrentAuthenticationMethod(protocol);
};

beforeEach(async () => {
	await testDb.truncate([
		'ApiKey',
		'AuthIdentity',
		'SharedWorkflow',
		'WorkflowEntity',
		'SharedCredentials',
		'CredentialsEntity',
		'ProjectRelation',
		'Project',
		'User',
	]);
	await scimTokenRepository().delete({});
	await Container.get(ScimSettingsService).update({
		policy: { ...DEFAULT_SCIM_DEPROVISIONING_POLICY },
	});

	// Every test except the opt-in ones runs with the opt-in on.
	Container.get(ScimConfig).optIn = true;
	instanceFlag().mockResolvedValue(undefined);
	// The opt-in keeps the flag result, so a test must not see the result of
	// the test before it.
	await Container.get(ScimOptInService).refreshSettings();

	// SCIM provisioning works only while SAML or OIDC single sign-on is on.
	await turnOnSso('saml');

	owner = await createOwner();
	admin = await createAdmin();

	const response = await testServer.authAgentFor(admin).post('/scim/token').expect(201);
	token = response.body.data.token;

	await Container.get(ScimSettingsService).setEnabled(true);
});

describe('SCIM /scim/v2 authentication', () => {
	it.each(scimRoutes)('%s %s returns 401 without a token', async (method, path) => {
		const response = await scimRequest(method, path, { bearer: null });

		expect(response.status).toBe(401);
		expect(response.body).toMatchObject({ schemas: [ERROR_SCHEMA], status: '401' });
	});

	it.each(scimRoutes)('%s %s returns 401 with an unknown token', async (method, path) => {
		const response = await scimRequest(method, path, { bearer: 'not-a-scim-token' });

		expect(response.status).toBe(401);
	});

	it.each(scimRoutes)('%s %s returns 403 when SCIM is disabled', async (method, path) => {
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
		await scimTokenRepository().replace(
			current?.tokenHash ?? null,
			{
				tokenHash: hashScimToken(legacyToken),
				tokenHint: legacyToken.slice(-4),
				createdById: admin.id,
			},
			{},
		);

		expect((await scimRequest('get', '/Users', { bearer: legacyToken })).status).toBe(200);
	});

	// Show-once: no code path needs the value, so a database read must not give a working token.
	it('stores only a hash and the last four characters of the token', async () => {
		const stored = await scimTokenRepository().findInstanceToken({});

		expect(stored).toMatchObject({ tokenHash: hashScimToken(token), tokenHint: token.slice(-4) });
		expect(JSON.stringify(stored)).not.toContain(token);
	});
});

describe('SCIM connection status', () => {
	const config = async () => {
		const response = await testServer.authAgentFor(owner).get('/scim/config').expect(200);
		return response.body.data;
	};

	const rotate = async () => {
		const response = await testServer.authAgentFor(admin).post('/scim/token').expect(201);
		return response.body.data.token as string;
	};

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
		await scimRequest('get', '/Users').expect(200);
		await scimRequest('get', '/Users', { bearer: 'not-a-scim-token' }).expect(401);
		expect((await config()).status).toBe('error');

		await scimRequest('get', '/Users').expect(200);

		const data = await config();
		expect(data.status).toBe('connected');
		expect(data.lastAuthFailure).toMatchObject({ reason: 'invalid_token' });
	});

	it('clears the failure when an admin rotates the token', async () => {
		await scimRequest('get', '/Users', { bearer: 'not-a-scim-token' }).expect(401);
		expect((await config()).status).toBe('error');

		await rotate();

		const data = await config();
		expect(data.lastAuthFailure).toBeNull();
		expect(data.status).toBe('waiting');
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
	it('creates a member by default and returns a Location header', async () => {
		const response = await scimRequest('post', '/Users', {
			body: {
				schemas: [USER_SCHEMA],
				userName: 'New.User@Example.com',
				name: { givenName: 'New', familyName: 'User' },
			},
		}).expect(201);

		expect(response.headers.location).toBe(response.body.meta.location);
		expect(response.headers.location).toMatch(new RegExp(`/scim/v2/Users/${response.body.id}$`));
		expect(response.body.schemas).toEqual([USER_SCHEMA, SCIM_N8N_USER_SCHEMA]);
		expect(response.body.roles).toEqual([{ value: 'global:member', primary: true }]);
		expect(response.body[SCIM_N8N_USER_SCHEMA]).toEqual({ instanceRole: 'global:member' });
		expect(response.body.active).toBe(true);

		const created = await reload(response.body.id);
		expect(created.email).toBe('new.user@example.com');
		expect(created.role.slug).toBe('global:member');
		expect(created.disabled).toBe(false);
	});

	it('creates an admin from the core roles attribute', async () => {
		const response = await scimRequest('post', '/Users', {
			body: {
				schemas: [USER_SCHEMA],
				userName: 'roles.admin@example.com',
				roles: [{ value: 'global:admin', primary: true }],
			},
		}).expect(201);

		expect((await reload(response.body.id)).role.slug).toBe('global:admin');
	});

	it('creates an admin from the n8n extension, which wins over roles', async () => {
		const response = await scimRequest('post', '/Users', {
			body: {
				schemas: [USER_SCHEMA, SCIM_N8N_USER_SCHEMA],
				userName: 'extension.admin@example.com',
				roles: [{ value: 'global:member' }],
				[SCIM_N8N_USER_SCHEMA]: { instanceRole: 'global:admin' },
			},
		}).expect(201);

		expect((await reload(response.body.id)).role.slug).toBe('global:admin');
	});

	it.each([
		['the owner role', { instanceRole: 'global:owner' }],
		['an unknown role', { instanceRole: 'global:does-not-exist' }],
		['a project role', { instanceRole: 'project:admin' }],
	])('rejects %s with 400 invalidValue', async (_, extension) => {
		const response = await scimRequest('post', '/Users', {
			body: {
				schemas: [USER_SCHEMA, SCIM_N8N_USER_SCHEMA],
				userName: 'rejected@example.com',
				[SCIM_N8N_USER_SCHEMA]: extension,
			},
		}).expect(400);

		expect(response.body.scimType).toBe('invalidValue');
		expect(
			await Container.get(UserRepository).findOne({ where: { email: 'rejected@example.com' } }),
		).toBeNull();
	});

	it('applies the role on replace and on each patch form', async () => {
		const member = await createMember();

		await scimRequest('put', `/Users/${member.id}`, {
			body: {
				schemas: [USER_SCHEMA],
				userName: member.email,
				roles: [{ value: 'global:admin' }],
			},
		}).expect(200);
		expect((await reload(member.id)).role.slug).toBe('global:admin');

		await scimRequest('patch', `/Users/${member.id}`, {
			body: patchOps({ op: 'replace', path: 'roles', value: [{ value: 'global:member' }] }),
		}).expect(200);
		expect((await reload(member.id)).role.slug).toBe('global:member');

		await scimRequest('patch', `/Users/${member.id}`, {
			body: patchOps({
				op: 'replace',
				path: `${SCIM_N8N_USER_SCHEMA}:instanceRole`,
				value: 'global:admin',
			}),
		}).expect(200);
		expect((await reload(member.id)).role.slug).toBe('global:admin');

		await scimRequest('patch', `/Users/${member.id}`, {
			body: patchOps({
				op: 'add',
				value: { [SCIM_N8N_USER_SCHEMA]: { instanceRole: 'global:member' } },
			}),
		}).expect(200);
		expect((await reload(member.id)).role.slug).toBe('global:member');
	});

	it('never changes the role of the instance owner', async () => {
		const response = await scimRequest('patch', `/Users/${owner.id}`, {
			body: patchOps({ op: 'replace', path: 'roles', value: [{ value: 'global:member' }] }),
		}).expect(403);

		expect(response.body.detail).toMatch(/owner/);
		expect((await reload(owner.id)).role.slug).toBe('global:owner');
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

	it('keeps the marker false for a user that SCIM updates but did not create', async () => {
		const member = await createMember();

		await setActive(member.id, false);

		expect(await listedUser(member.id)).toMatchObject({ isScimManaged: false, disabled: true });
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
		await provision('first@example.com');
		await provision('second@example.com');
		await provision('inactive@example.com', false);

		expect(await config()).toMatchObject({ provisionedCount: 3, deactivatedCount: 1 });
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

describe('SCIM deprovisioning policy', () => {
	const patchConfig = (body: object) =>
		testServer.authAgentFor(admin).patch('/scim/config').send(body);

	const getConfig = async () => {
		const response = await testServer.authAgentFor(admin).get('/scim/config').expect(200);
		return response.body.data;
	};

	const deleteViaScim = async (id: string) => await scimRequest('delete', `/Users/${id}`);

	/** A member with one workflow and one credential in their personal project. */
	const createMemberWithWork = async () => {
		const member = await createMember();
		const workflow = await createWorkflow({ name: 'Leaver workflow' }, member);
		const credential = await saveCredential(randomCredentialPayload(), {
			user: member,
			role: 'credential:owner',
		});
		return { member, personalProject: await getPersonalProject(member), workflow, credential };
	};

	const owningProjects = async (workflowId: string, credentialId: string) => ({
		workflow: (await Container.get(SharedWorkflowRepository).getWorkflowOwningProject(workflowId))
			?.id,
		credential: (
			await Container.get(SharedCredentialsRepository).findCredentialOwningProject(credentialId)
		)?.id,
	});

	const userExists = async (id: string) => await Container.get(UserRepository).existsBy({ id });

	describe('PATCH /rest/scim/config', () => {
		it('changes only onDelete and keeps enabled', async () => {
			const response = await patchConfig({ onDelete: 'delete' }).expect(200);

			expect(response.body.data).toEqual({
				enabled: true,
				onDelete: 'delete',
				dataAction: 'transfer',
				transferProjectId: null,
			});
			expect(await getConfig()).toMatchObject({
				enabled: true,
				onDelete: 'delete',
				dataAction: 'transfer',
				transferTarget: null,
			});
		});

		// The settings page saves each field when it changes, so two saves can
		// overlap.
		it('keeps both changes of two saves at the same time', async () => {
			await Promise.all([
				patchConfig({ onDelete: 'delete' }).expect(200),
				patchConfig({ dataAction: 'delete' }).expect(200),
			]);

			expect(await getConfig()).toMatchObject({ onDelete: 'delete', dataAction: 'delete' });
		});

		it('saves the switch and the policy of one body together', async () => {
			await Container.get(ScimSettingsService).setEnabled(false);

			const response = await patchConfig({ enabled: true, onDelete: 'delete' }).expect(200);

			expect(response.body.data).toMatchObject({ enabled: true, onDelete: 'delete' });
			expect(await getConfig()).toMatchObject({ enabled: true, onDelete: 'delete' });
			expect(await Container.get(ScimSettingsService).isEnabled()).toBe(true);
		});

		it('keeps SCIM off when the body changes only the policy', async () => {
			await Container.get(ScimSettingsService).setEnabled(false);

			await patchConfig({ dataAction: 'delete' }).expect(200);

			expect(await getConfig()).toMatchObject({ enabled: false, dataAction: 'delete' });
		});

		it('returns 400 for a body without fields', async () => {
			await patchConfig({}).expect(400);

			expect(await getConfig()).toMatchObject({ enabled: true, onDelete: 'disable' });
		});

		it('returns 400 and saves nothing for a transfer project that does not exist', async () => {
			const response = await patchConfig({
				enabled: false,
				onDelete: 'delete',
				transferProjectId: 'does-not-exist',
			});

			expect(response.status).toBe(400);
			expect(await getConfig()).toMatchObject({
				enabled: true,
				onDelete: 'disable',
				transferTarget: null,
			});
		});

		it('returns 400 for the personal project of a deactivated user', async () => {
			const member = await createMember();
			await Container.get(UserRepository).update({ id: member.id }, { disabled: true });
			const { id } = await getPersonalProject(member);

			await patchConfig({ transferProjectId: id }).expect(400);
		});

		it('returns 403 to a member', async () => {
			const member = await createMember();

			await testServer
				.authAgentFor(member)
				.patch('/scim/config')
				.send({ onDelete: 'delete' })
				.expect(403);
		});
	});

	describe('GET /rest/scim/config', () => {
		it('describes a team project target', async () => {
			const team = await createTeamProject('Platform');

			await patchConfig({ transferProjectId: team.id }).expect(200);

			expect((await getConfig()).transferTarget).toEqual({
				projectId: team.id,
				kind: 'project',
				name: 'Platform',
				icon: null,
				valid: true,
			});
		});

		it('describes a person target', async () => {
			const member = await createMember();
			const { id } = await getPersonalProject(member);

			await patchConfig({ transferProjectId: id }).expect(200);

			expect((await getConfig()).transferTarget).toEqual({
				projectId: id,
				kind: 'person',
				name: `${member.firstName} ${member.lastName}`,
				email: member.email,
				valid: true,
			});
		});

		it('returns valid false after the person is deactivated', async () => {
			const member = await createMember();
			const { id } = await getPersonalProject(member);
			await patchConfig({ transferProjectId: id }).expect(200);

			await Container.get(UserRepository).update({ id: member.id }, { disabled: true });

			expect((await getConfig()).transferTarget).toMatchObject({ projectId: id, valid: false });
		});

		it('returns valid false after the project is deleted', async () => {
			const team = await createTeamProject();
			await patchConfig({ transferProjectId: team.id }).expect(200);

			await Container.get(ProjectRepository).delete({ id: team.id });

			expect((await getConfig()).transferTarget).toEqual({
				projectId: team.id,
				kind: null,
				name: null,
				valid: false,
			});
		});
	});

	describe('DELETE /scim/v2/Users/:id', () => {
		it('disables the user and keeps the work with onDelete disable', async () => {
			const { member, personalProject, workflow, credential } = await createMemberWithWork();

			await patchConfig({ onDelete: 'disable', dataAction: 'delete' }).expect(200);
			expect((await deleteViaScim(member.id)).status).toBe(204);

			expect((await reload(member.id)).disabled).toBe(true);
			expect(await owningProjects(workflow.id, credential.id)).toEqual({
				workflow: personalProject.id,
				credential: personalProject.id,
			});
		});

		it('moves the work to a team project without members', async () => {
			const team = await createTeamProject('Leavers');
			const { member, personalProject, workflow, credential } = await createMemberWithWork();
			await patchConfig({
				onDelete: 'delete',
				dataAction: 'transfer',
				transferProjectId: team.id,
			}).expect(200);
			const emit = vi.spyOn(Container.get(EventService), 'emit');

			const response = await deleteViaScim(member.id);

			expect(response.status).toBe(204);
			expect(await userExists(member.id)).toBe(false);
			expect(await Container.get(ProjectRepository).existsBy({ id: personalProject.id })).toBe(
				false,
			);
			expect(await owningProjects(workflow.id, credential.id)).toEqual({
				workflow: team.id,
				credential: team.id,
			});
			expect(emit).toHaveBeenCalledWith(
				'user-deleted',
				expect.objectContaining({
					user: null,
					source: 'scim',
					targetUserId: member.id,
					migrationStrategy: 'transfer_data',
					migrationUserId: undefined,
				}),
			);
			emit.mockRestore();
		});

		it('deletes the user, the personal project and the work with dataAction delete', async () => {
			const { member, personalProject, workflow, credential } = await createMemberWithWork();
			await patchConfig({ onDelete: 'delete', dataAction: 'delete' }).expect(200);

			const response = await deleteViaScim(member.id);

			expect(response.status).toBe(204);
			expect(await userExists(member.id)).toBe(false);
			expect(await Container.get(ProjectRepository).existsBy({ id: personalProject.id })).toBe(
				false,
			);
			expect(await Container.get(WorkflowRepository).existsBy({ id: workflow.id })).toBe(false);
			expect(await Container.get(CredentialsRepository).existsBy({ id: credential.id })).toBe(
				false,
			);
		});

		it('moves the work to the personal project of the owner when the target is the deleted user', async () => {
			const { member, personalProject, workflow, credential } = await createMemberWithWork();
			await patchConfig({
				onDelete: 'delete',
				dataAction: 'transfer',
				transferProjectId: personalProject.id,
			}).expect(200);

			const response = await deleteViaScim(member.id);

			expect(response.status).toBe(204);
			expect(await userExists(member.id)).toBe(false);
			const ownerProject = await getPersonalProject(owner);
			expect(await owningProjects(workflow.id, credential.id)).toEqual({
				workflow: ownerProject.id,
				credential: ownerProject.id,
			});
		});

		it('moves the work to the personal project of the owner without a stored target', async () => {
			const { member, workflow, credential } = await createMemberWithWork();
			await patchConfig({ onDelete: 'delete', dataAction: 'transfer' }).expect(200);

			await deleteViaScim(member.id);

			const ownerProject = await getPersonalProject(owner);
			expect(await owningProjects(workflow.id, credential.id)).toEqual({
				workflow: ownerProject.id,
				credential: ownerProject.id,
			});
		});

		it('returns a SCIM error and keeps the instance owner', async () => {
			await patchConfig({ onDelete: 'delete', dataAction: 'delete' }).expect(200);

			const response = await deleteViaScim(owner.id);

			expect(response.status).toBe(403);
			expect(response.body).toMatchObject({ schemas: [ERROR_SCHEMA], status: '403' });
			const current = await reload(owner.id);
			expect(current.disabled).toBe(false);
			expect(current.role.slug).toBe('global:owner');
		});

		it('returns 404 for an unknown user', async () => {
			await patchConfig({ onDelete: 'delete' }).expect(200);

			expect((await deleteViaScim('00000000-0000-0000-0000-000000000000')).status).toBe(404);
		});

		it('only disables the user on PATCH active false', async () => {
			const { member, personalProject, workflow, credential } = await createMemberWithWork();
			await patchConfig({ onDelete: 'delete', dataAction: 'delete' }).expect(200);

			await scimRequest('patch', `/Users/${member.id}`, {
				body: patchOps({ op: 'replace', path: 'active', value: false }),
			}).expect(200);

			expect((await reload(member.id)).disabled).toBe(true);
			expect(await owningProjects(workflow.id, credential.id)).toEqual({
				workflow: personalProject.id,
				credential: personalProject.id,
			});
		});
	});
});

describe('GET /rest/scim/transfer-targets', () => {
	type PersonItem = { projectId: string; userId: string; email: string | null };
	type ProjectItem = { projectId: string; name: string };

	const getTargets = async (query: Record<string, string | number> = {}) => {
		// Do not pool sockets. See `scimRequest`.
		const response = await testServer
			.authAgentFor(admin)
			.get('/scim/transfer-targets')
			.set('Connection', 'close')
			.query(query)
			.expect(200);
		return response.body.data;
	};

	const userIds = (items: PersonItem[]) => items.map(({ userId }) => userId);

	const rename = async (user: User, firstName: string, lastName: string) =>
		await Container.get(UserRepository).update({ id: user.id }, { firstName, lastName });

	const disable = async (user: User) =>
		await Container.get(UserRepository).update({ id: user.id }, { disabled: true });

	it('returns one page of each section with totals for 200 people and 50 projects', async () => {
		// The owner and the admin come from the global setup.
		await createManyUsers(198);
		await Promise.all(Array.from({ length: 50 }, async () => await createTeamProject()));

		const { people, projects } = await getTargets({ take: 50 });

		expect(people).toMatchObject({ total: 200, count: 200 });
		expect(people.items).toHaveLength(50);
		expect(projects).toMatchObject({ total: 50, count: 50 });
		expect(projects.items).toHaveLength(50);
	});

	it('finds a person by the current email when the project name has the old email', async () => {
		const member = await createMember();
		const newEmail = 'renamed.person@example.com';
		await Container.get(UserRepository).update({ id: member.id }, { email: newEmail });
		const personalProject = await getPersonalProject(member);
		expect(personalProject.name).not.toContain(newEmail);

		const { people } = await getTargets({ search: 'RENAMED.person' });

		expect(people).toMatchObject({ total: 3, count: 1 });
		expect(people.items).toEqual([
			{
				projectId: personalProject.id,
				userId: member.id,
				firstName: member.firstName,
				lastName: member.lastName,
				email: newEmail,
				role: 'global:member',
			},
		]);
	});

	it('finds a person by the full name', async () => {
		const member = await createMember();
		await rename(member, 'Grace', 'Hopper');

		const { people } = await getTargets({ search: 'grace hop' });

		expect(userIds(people.items)).toEqual([member.id]);
	});

	it('leaves out deactivated users and returns only valid targets', async () => {
		const active = await createMember();
		const deactivated = await createMember();
		await disable(deactivated);
		await createTeamProject('Platform');

		const { people, projects } = await getTargets();
		const searched = await getTargets({ search: deactivated.email });

		expect(userIds(people.items)).toContain(active.id);
		expect(userIds(people.items)).not.toContain(deactivated.id);
		expect(people).toMatchObject({ total: 3, count: 3 });
		expect(searched.people).toEqual({ total: 3, count: 0, items: [] });

		const repository = Container.get(ScimTransferTargetRepository);
		for (const { projectId } of [...people.items, ...projects.items]) {
			const project = await repository.findWithCreator(projectId, {});
			expect(project && isValidScimTransferTarget(project)).toBe(true);
		}
	});

	it('orders people by owner, admins and other roles, each group by name', async () => {
		await rename(owner, 'Zed', 'Owner');
		await rename(admin, 'Mia', 'Admin');
		const secondAdmin = await createAdmin();
		await rename(secondAdmin, 'Bea', 'Admin');
		const cara = await createMember();
		await rename(cara, 'Cara', 'Member');
		const abe = await createMember();
		await rename(abe, 'abe', 'Member');
		// Chat users and custom-role users sort with the members (Q29 default).
		const chatUser = await createChatUser();
		await rename(chatUser, 'Bob', 'Chat');
		const pending = await createUserShell(GLOBAL_MEMBER_ROLE);

		const { people } = await getTargets();

		expect(userIds(people.items)).toEqual([
			owner.id,
			secondAdmin.id,
			admin.id,
			abe.id,
			chatUser.id,
			cara.id,
			pending.id,
		]);
	});

	it('counts the members and the owned workflows of a team project', async () => {
		const team = await createTeamProject('Platform');
		const members = await Promise.all([createMember(), createMember(), createMember()]);
		for (const member of members) await linkUserToProject(member, team, 'project:editor');
		for (let i = 0; i < 7; i++) await createWorkflow({}, team);
		await createWorkflow({ isArchived: true }, team);
		const sharedOnly = await createWorkflow({}, owner);
		await shareWorkflowWithProjects(sharedOnly, [{ project: team }]);
		const emptyTeam = await createTeamProject('Archive');

		const { projects } = await getTargets({ type: 'projects' });

		expect(projects.items).toEqual([
			{ projectId: emptyTeam.id, name: 'Archive', icon: null, memberCount: 0, workflowCount: 0 },
			{ projectId: team.id, name: 'Platform', icon: null, memberCount: 3, workflowCount: 7 },
		]);
	});

	it('narrows the count with the search and keeps the total', async () => {
		await createTeamProject('Platform');
		await createTeamProject('Data platform');
		await createTeamProject('Sales');

		const { projects } = await getTargets({ search: 'PLATFORM' });

		expect(projects.total).toBe(3);
		expect(projects.count).toBe(2);
		expect(projects.items.map(({ name }: ProjectItem) => name)).toEqual([
			'Data platform',
			'Platform',
		]);
	});

	it('pages one section with type, skip and take', async () => {
		await createManyUsers(4);

		const all = await getTargets({ type: 'people' });
		const page = await getTargets({ type: 'people', skip: 2, take: 2 });

		expect(Object.keys(page)).toEqual(['people']);
		expect(page.people).toMatchObject({ total: 6, count: 6 });
		expect(userIds(page.people.items)).toEqual(userIds(all.people.items).slice(2, 4));
	});

	it('returns 403 to a member', async () => {
		const member = await createMember();

		await testServer.authAgentFor(member).get('/scim/transfer-targets').expect(403);
	});

	it('answers while SCIM is off', async () => {
		await Container.get(ScimSettingsService).setEnabled(false);

		await getTargets();
	});

	it('runs the same number of queries for every page size', async () => {
		await createManyUsers(5);
		for (let i = 0; i < 5; i++) {
			const team = await createTeamProject();
			await linkUserToProject(admin, team, 'project:admin');
			await createWorkflow({}, team);
		}

		const countQueries = async (take: number) => {
			const logQuery = vi.spyOn(Container.get(DataSource).logger, 'logQuery');
			try {
				const { people, projects } = await Container.get(
					ScimDeprovisioningService,
				).findTransferTargets({ search: undefined, skip: 0, take });
				expect(people?.items).toHaveLength(take);
				expect(projects?.items).toHaveLength(take);
				return logQuery.mock.calls.length;
			} finally {
				logQuery.mockRestore();
			}
		};

		const queriesForOne = await countQueries(1);

		expect(queriesForOne).toBeGreaterThan(0);
		expect(await countQueries(5)).toBe(queriesForOne);
	});
});

describe('SCIM /scim/v2/Schemas', () => {
	it('lists the User schema and the n8n extension with the assignable roles', async () => {
		const response = await scimRequest('get', '/Schemas').expect(200);

		const [user, extension] = response.body.Resources;
		expect(user.schemas).toEqual(['urn:ietf:params:scim:schemas:core:2.0:Schema']);
		expect(user.attributes.map((attribute: { name: string }) => attribute.name)).toContain('roles');
		expect(extension.id).toBe(SCIM_N8N_USER_SCHEMA);
		const instanceRole = extension.attributes.find(
			(attribute: { name: string }) => attribute.name === 'instanceRole',
		);
		expect(instanceRole.canonicalValues).toEqual(
			expect.arrayContaining(['global:admin', 'global:member']),
		);
		expect(instanceRole.canonicalValues).not.toContain('global:owner');
	});

	it('declares the extension on the User resource type', async () => {
		const response = await scimRequest('get', '/ResourceTypes').expect(200);

		expect(response.body.Resources[0].schemaExtensions).toEqual([
			{ schema: SCIM_N8N_USER_SCHEMA, required: false },
		]);
	});
});

describe('SCIM opt-in', () => {
	const restRoutes = [
		['get', '/scim/config'],
		['patch', '/scim/config'],
		['post', '/scim/token'],
		['delete', '/scim/token'],
		['get', '/scim/transfer-targets'],
	] as const;

	const moduleSettings = async () => {
		// Production reads the switch at startup. These tests change it after
		// module init, so make the settings snapshot again.
		await Container.get(ModuleRegistry).refreshModuleSettings('scim');
		const response = await testServer.authAgentFor(admin).get('/module-settings').expect(200);
		return response.body.data.scim;
	};

	const turnOnFlag = () =>
		instanceFlag().mockImplementation(async (flag) => flag === SCIM_OPT_IN_FLAG);

	describe('while the opt-in is off', () => {
		beforeEach(() => {
			Container.get(ScimConfig).optIn = false;
		});

		it.each(scimRoutes)('%s /scim/v2%s returns 404 with a valid token', async (method, path) => {
			expect((await scimRequest(method, path)).status).toBe(404);
		});

		it.each(scimRoutes)('%s /scim/v2%s returns 404 without a token', async (method, path) => {
			expect((await scimRequest(method, path, { bearer: null })).status).toBe(404);
		});

		// The gate runs before the session and the scope checks, so no caller
		// can tell that the routes exist.
		it.each(restRoutes)('%s /rest%s returns 404 to an admin', async (method, path) => {
			const response = await testServer
				.authAgentFor(admin)
				[method](path)
				.send(method === 'patch' ? { enabled: true } : {});

			expect(response.status).toBe(404);
		});

		it.each(restRoutes)('%s /rest%s returns 404 to a member', async (method, path) => {
			const member = await createMember();
			const response = await testServer
				.authAgentFor(member)
				[method](path)
				.send(method === 'patch' ? { enabled: true } : {});

			expect(response.status).toBe(404);
		});

		it.each(restRoutes)('%s /rest%s returns 404 without a session', async (method, path) => {
			const response = await testServer.authlessAgent[method](path).send(
				method === 'patch' ? { enabled: true } : {},
			);

			expect(response.status).toBe(404);
		});

		it('keeps the SCIM setting and the token', async () => {
			await testServer.authAgentFor(admin).patch('/scim/config').send({ enabled: false });

			expect(await Container.get(ScimSettingsService).isEnabled()).toBe(true);
			expect(await scimTokenRepository().findInstanceToken({})).not.toBeNull();
		});

		it('shows the opt-in as off in the module settings', async () => {
			expect(await moduleSettings()).toEqual({
				scimEnabled: true,
				hasToken: true,
				available: false,
				optInSource: null,
			});
		});
	});

	it('answers with the config switch on and shows the source config', async () => {
		await scimRequest('get', '/ServiceProviderConfig').expect(200);
		await scimRequest('get', '/Users').expect(200);
		await testServer.authAgentFor(admin).get('/scim/config').expect(200);

		expect(await moduleSettings()).toMatchObject({ available: true, optInSource: 'config' });
		expect(instanceFlag()).not.toHaveBeenCalled();
	});

	it('answers with the instance flag on and shows the source flag', async () => {
		Container.get(ScimConfig).optIn = false;
		turnOnFlag();

		await scimRequest('get', '/ServiceProviderConfig').expect(200);
		await scimRequest('get', '/Users').expect(200);
		await testServer.authAgentFor(admin).get('/scim/config').expect(200);

		expect(await moduleSettings()).toMatchObject({ available: true, optInSource: 'flag' });
		expect(instanceFlag()).toHaveBeenCalledWith(SCIM_OPT_IN_FLAG);
	});

	it('returns 404 to the identity provider once the opt-in turns off', async () => {
		Container.get(ScimConfig).optIn = false;
		turnOnFlag();
		await scimRequest('get', '/Users').expect(200);

		instanceFlag().mockResolvedValue(false);
		// The new flag value applies at the next refresh.
		await scimRequest('get', '/Users').expect(200);
		await Container.get(ScimOptInService).refreshSettings();

		const response = await scimRequest('get', '/Users');
		expect(response.status).toBe(404);
		expect(await Container.get(ScimSettingsService).isEnabled()).toBe(true);
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

	// The SCIM module turns SCIM off in an event listener, after the toggle
	// returns.
	const waitForScimOff = async () =>
		await vi.waitFor(async () => expect(await scimSettings().isEnabled()).toBe(false));

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

	it('turns SCIM off and keeps the token and the policy when an admin turns SAML login off', async () => {
		const team = await createTeamProject('Platform');
		const policy = { onDelete: 'delete', dataAction: 'transfer', transferProjectId: team.id };
		await testServer.authAgentFor(admin).patch('/scim/config').send(policy).expect(200);
		const emit = vi.spyOn(Container.get(EventService), 'emit');

		await toggleSamlLogin(false);

		await waitForScimOff();
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
		expect(response.body.data).toMatchObject({
			enabled: false,
			hasToken: true,
			onDelete: 'delete',
			dataAction: 'transfer',
			transferTarget: { projectId: team.id, valid: true },
		});
		expect(await scimSettings().getDeprovisioningPolicy()).toEqual(policy);
	});

	it('keeps SCIM off when SAML turns on again, and the old token works once an admin enables SCIM', async () => {
		await toggleSamlLogin(false);
		await waitForScimOff();

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

describe('SCIM and manual invites', () => {
	const inviteeEmail = 'invitee@example.com';

	const invite = async (user: User = admin, role = 'global:member') =>
		await testServer
			.authAgentFor(user)
			.post('/invitations')
			.send([{ email: inviteeEmail, role }]);

	const invitedUser = async () =>
		await Container.get(UserRepository).findOne({
			where: { email: inviteeEmail },
			relations: ['authIdentities', 'role'],
		});

	/** Invites through the REST API and returns the user shell. */
	const inviteShell = async () => {
		const response = await invite();
		expect(response.status).toBe(200);
		const [{ user }] = response.body.data;
		return user as { id: string; email: string };
	};

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it.each(['saml', 'oidc'] as const)(
		'creates the invite while %s is on and SCIM is enabled',
		async (protocol) => {
			await turnOnSso(protocol);

			const response = await invite();

			expect(response.status).toBe(200);
			expect(response.body.data).toEqual([
				expect.objectContaining({
					user: expect.objectContaining({ email: inviteeEmail, role: 'global:member' }),
					error: '',
				}),
			]);
			// The accept page rejects invite links under SSO, so the response
			// has no link to copy. The invitee signs in through SSO.
			expect(response.body.data[0].user.inviteAcceptUrl).toBeUndefined();
			expect(await invitedUser()).toMatchObject({ isPending: true, password: null });
		},
	);

	describe('while single sign-on assigns the instance roles', () => {
		beforeEach(() => {
			vi.spyOn(Container.get(ProvisioningService), 'isInstanceRoleManaged').mockResolvedValue(true);
		});

		it('returns 403 and creates no invite for the admin role', async () => {
			const response = await invite(admin, 'global:admin');

			expect(response.status).toBe(403);
			expect(response.body.message).toBe(INVITE_ROLE_MANAGED_MESSAGE);
			expect(await invitedUser()).toBeNull();
		});

		it('creates the invite for the member role', async () => {
			expect((await invite()).status).toBe(200);
			expect(await invitedUser()).toMatchObject({ role: { slug: 'global:member' } });
		});
	});

	it('creates an admin invite while single sign-on does not assign the instance roles', async () => {
		const response = await invite(admin, 'global:admin');

		expect(response.status).toBe(200);
		expect(await invitedUser()).toMatchObject({ role: { slug: 'global:admin' } });
	});

	it('returns 400 as on master while SAML is on and SCIM is off', async () => {
		await Container.get(ScimSettingsService).setEnabled(false);

		const response = await invite();

		expect(response.status).toBe(400);
		expect(response.body.message).toBe(
			'SSO is enabled, so users are managed by the Identity Provider and cannot be added through invites',
		);
		expect(await invitedUser()).toBeNull();
	});

	it('returns 400 as on master while LDAP is the authentication method', async () => {
		await setCurrentAuthenticationMethod('ldap');

		const response = await invite();

		expect(response.status).toBe(400);
		expect(await invitedUser()).toBeNull();
	});

	it('returns 400 as on master while the SCIM opt-in is off', async () => {
		Container.get(ScimConfig).optIn = false;

		const response = await invite();

		expect(response.status).toBe(400);
		expect(await invitedUser()).toBeNull();
	});

	it('returns 400 as on master while SAML is not licensed', async () => {
		testServer.license.disable('feat:saml');

		expect((await invite()).status).toBe(400);
	});

	describe('through the public API', () => {
		const publicInvite = async () => {
			const { apiKey } = await addApiKey(owner, { scopes: ['user:create'] });
			return await testServer
				.publicApiAgentWithApiKey(apiKey)
				.post('/users')
				.send([{ email: inviteeEmail, role: 'global:member' }]);
		};

		it('creates the invite while SAML is on and SCIM is enabled', async () => {
			const response = await publicInvite();

			expect(response.status).toBe(201);
			expect(response.body).toEqual([
				expect.objectContaining({
					user: expect.objectContaining({ email: inviteeEmail }),
					error: '',
				}),
			]);
			expect(await invitedUser()).toMatchObject({ isPending: true });
		});

		it('returns 400 while SAML is on and SCIM is off', async () => {
			await Container.get(ScimSettingsService).setEnabled(false);

			const response = await publicInvite();

			expect(response.status).toBe(400);
			expect(await invitedUser()).toBeNull();
		});
	});

	it('links the invite to the SAML identity when the invitee signs in through SAML', async () => {
		const shell = await inviteShell();
		const samlService = Container.get(SamlService);
		vi.spyOn(samlService, 'getAttributesFromLoginResponse').mockResolvedValue({
			mapped: {
				email: inviteeEmail,
				firstName: 'Ivy',
				lastName: 'Invitee',
				userPrincipalName: 'saml-invitee',
			},
			raw: {},
		});

		const result = await samlService.handleSamlLogin({} as express.Request, 'post');

		expect(result.authenticatedUser?.id).toBe(shell.id);
		expect(result.onboardingRequired).toBe(false);
		expect(
			await Container.get(AuthIdentityRepository).findOneBy({
				providerId: 'saml-invitee',
				providerType: 'saml',
			}),
		).toMatchObject({ userId: shell.id });
		expect(await invitedUser()).toMatchObject({
			id: shell.id,
			firstName: 'Ivy',
			lastName: 'Invitee',
			isPending: false,
			role: { slug: GLOBAL_MEMBER_ROLE.slug },
		});
		expect(await Container.get(UserRepository).countBy({ email: inviteeEmail })).toBe(1);
	});

	describe('with OIDC', () => {
		const oidcConfig: Omit<OidcConfigDto, 'loginEnabled'> = {
			clientId: 'scim-test-client',
			clientSecret: 'scim-test-secret',
			discoveryEndpoint: 'https://idp.example.com/.well-known/openid-configuration',
			prompt: 'select_account',
			authenticationContextClassReference: [],
			additionalScopes: '',
			rpInitiatedLogoutEnabled: false,
		};

		const oidcService = () => Container.get(OidcService);

		beforeEach(async () => {
			const { Configuration } =
				await vi.importActual<typeof import('openid-client')>('openid-client');
			openidClient.discovery.mockResolvedValue(
				new Configuration(
					{
						issuer: 'https://idp.example.com',
						authorization_endpoint: 'https://idp.example.com/auth',
						userinfo_endpoint: 'https://idp.example.com/userinfo',
					},
					oidcConfig.clientId,
				),
			);

			// OIDC can turn on only from the email method.
			await setCurrentAuthenticationMethod('email');
			await oidcService().updateConfig({ ...oidcConfig, loginEnabled: true });
		});

		afterEach(async () => {
			// From the email method, OIDC turns off without the SCIM cascade, so
			// no listener runs into the next test.
			await setCurrentAuthenticationMethod('email');
			await oidcService().updateConfig({ ...oidcConfig, loginEnabled: false });
		});

		it('links the invite to the OIDC identity when the invitee signs in through OIDC', async () => {
			const shell = await inviteShell();
			const state = oidcService().generateState();
			const nonce = oidcService().generateNonce();
			const now = Math.floor(Date.now() / 1000);
			openidClient.authorizationCodeGrant.mockResolvedValueOnce({
				access_token: 'access-token',
				id_token: 'id-token',
				token_type: 'bearer',
				claims: () => ({
					sub: 'oidc-invitee',
					iss: 'https://idp.example.com',
					aud: oidcConfig.clientId,
					iat: now,
					exp: now + 3600,
				}),
				expiresIn: () => 3600,
			});
			openidClient.fetchUserInfo.mockResolvedValueOnce({
				sub: 'oidc-invitee',
				email: inviteeEmail,
				email_verified: true,
			});

			const { user } = await oidcService().loginUser(
				new URL(`http://localhost:5678/rest/sso/oidc/callback?code=code&state=${state.plaintext}`),
				state.signed,
				nonce.signed,
			);

			expect(user.id).toBe(shell.id);
			expect(
				await Container.get(AuthIdentityRepository).findOneBy({
					providerId: 'oidc-invitee',
					providerType: 'oidc',
				}),
			).toMatchObject({ userId: shell.id });
			expect(await invitedUser()).toMatchObject({
				id: shell.id,
				isPending: false,
				role: { slug: GLOBAL_MEMBER_ROLE.slug },
			});
			expect(await Container.get(UserRepository).countBy({ email: inviteeEmail })).toBe(1);
		});
	});
});
