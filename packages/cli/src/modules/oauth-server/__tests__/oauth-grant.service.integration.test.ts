import { InvalidGrantError } from '@modelcontextprotocol/sdk/server/auth/errors.js';
import { Logger } from '@n8n/backend-common';
import { testDb, testModules } from '@n8n/backend-test-utils';
import { AuthIdentity, User, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource, In } from '@n8n/typeorm';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { mock } from 'vitest-mock-extended';

import { ProtectedResourceRegistry, type UrlService } from '@n8n/backend-services';
import { processUsers } from '@/modules/ldap.ee/helpers.ee';
import { UserDeactivationHooks } from '@/services/user-deactivation-hooks.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { createManyUsers, createUser } from '@test-integration/db/users';

import { AccessToken } from '../database/entities/oauth-access-token.entity';
import { AuthorizationCode } from '../database/entities/oauth-authorization-code.entity';
import { OAuthClient } from '../database/entities/oauth-client.entity';
import { RefreshToken } from '../database/entities/oauth-refresh-token.entity';
import { UserConsent } from '../database/entities/oauth-user-consent.entity';
import { AccessTokenRepository } from '../database/repositories/oauth-access-token.repository';
import { AuthorizationCodeRepository } from '../database/repositories/oauth-authorization-code.repository';
import { OAuthClientRepository } from '../database/repositories/oauth-client.repository';
import { OAuthGrantRepository } from '../database/repositories/oauth-grant.repository';
import { RefreshTokenRepository } from '../database/repositories/oauth-refresh-token.repository';
import { UserConsentRepository } from '../database/repositories/oauth-user-consent.repository';
import { OAuthAuthorizationCodeService } from '../oauth-authorization-code.service';
import { OAuthConsentService } from '../oauth-consent.service';
import { OAuthGrantService } from '../oauth-grant.service';
import { OAuthServerService } from '../oauth-server.service';
import type { OAuthSessionService } from '../oauth-session.service';
import type { OAuthSigningKeyService } from '../oauth-signing-key.service';
import { OAuthTokenService } from '../oauth-token.service';

// Share the transaction adapter loaded by the built BaseRepository.
const { TypeOrmTransactionRunner } = createRequire(__filename)(
	'@n8n/db/dist/services/typeorm-transaction',
) as typeof import('@n8n/db/dist/services/typeorm-transaction');

const resourceUrl = 'https://example.com/mcp';
const registry = new ProtectedResourceRegistry(mock<Logger>());
registry.register({
	id: 'instance-mcp',
	surface: 'instance-mcp',
	isDefault: true,
	isFirstParty: true,
	getResourceUrl: () => resourceUrl,
	getAudiences: () => [resourceUrl],
	scopes: [],
	authorize: async () => true,
});
const urls = mock<UrlService>();
urls.getInstanceBaseUrl.mockReturnValue('https://example.com');
let dataSource: DataSource;
let peer: DataSource | undefined;
let observer: DataSource | undefined;
let grants: OAuthGrantRepository;
let peerGrants: OAuthGrantRepository;
let gate: OAuthGrantService;
let tokens: OAuthTokenService;
let consentService: OAuthConsentService;
let server: OAuthServerService;
const sessions = mock<OAuthSessionService>();
let user: User;
let otherUser: User;
const clientId = 'shared-client';
const grantEntities = [AccessToken, RefreshToken, AuthorizationCode, UserConsent];

beforeAll(async () => {
	await testModules.loadModules(['oauth-server']);
	await testDb.init();
	dataSource = Container.get(DataSource);
	grants = Container.get(OAuthGrantRepository);
	await grants.deleteGrantsForDisabledUsers();
	if (dataSource.options.type === 'postgres') {
		peer = await new DataSource({
			...dataSource.options,
			synchronize: false,
			migrationsRun: false,
			dropSchema: false,
			logging: false,
		}).initialize();
		observer = await new DataSource(peer.options).initialize();
		peerGrants = new OAuthGrantRepository(peer, new TypeOrmTransactionRunner(peer, mock<Logger>()));
	}
	gate = Container.get(OAuthGrantService);
	tokens = new OAuthTokenService(
		mock<Logger>(),
		mock(),
		Container.get(UserRepository),
		Container.get(AccessTokenRepository),
		Container.get(RefreshTokenRepository),
		registry,
		mock<WorkflowFinderService>(),
		urls,
		mock<OAuthSigningKeyService>(),
		gate,
	);
	consentService = new OAuthConsentService(
		mock<Logger>(),
		sessions,
		Container.get(OAuthClientRepository),
		Container.get(UserConsentRepository),
		Container.get(OAuthAuthorizationCodeService),
		registry,
		urls,
		gate,
	);
	server = new OAuthServerService(
		mock(),
		mock(),
		sessions,
		Container.get(OAuthClientRepository),
		tokens,
		Container.get(OAuthAuthorizationCodeService),
		Container.get(UserConsentRepository),
		registry,
		mock(),
		urls,
		mock(),
		mock(),
		consentService,
		gate,
	);
});

beforeEach(async () => {
	const hooks = new UserDeactivationHooks();
	hooks.register('oauth-server', async (userId, ctx) => await grants.deleteUserGrants(userId, ctx));
	Container.set(UserDeactivationHooks, hooks);
	user = await createUser();
	await dataSource.manager.save(AuthIdentity.create(user, user.id));
	otherUser = await createUser();
	await dataSource.getRepository(OAuthClient).save({
		id: clientId,
		name: 'Test client',
		redirectUris: ['https://example.com/callback'],
		grantTypes: ['authorization_code', 'refresh_token'],
		tokenEndpointAuthMethod: 'none',
	});
	await seedGrant(user.id);
	await seedGrant(otherUser.id);
});

afterEach(async () => {
	vi.restoreAllMocks();
	await testDb.truncate(['OAuthClient', 'AuthIdentity']);
});
afterAll(async () => {
	await observer?.destroy();
	await peer?.destroy();
	await testDb.terminate();
});

async function seedGrant(userId: string) {
	await dataSource
		.getRepository(AccessToken)
		.insert({ token: `access-${userId}`, clientId, userId });
	await dataSource.getRepository(RefreshToken).insert({
		token: `refresh-${userId}`,
		clientId,
		userId,
		resource: resourceUrl,
		scope: [],
		expiresAt: Date.now() + 60_000,
	});
	await Container.get(AuthorizationCodeRepository).insertCode(
		{
			code: `code-${userId}`,
			clientId,
			userId,
			redirectUri: 'https://example.com/callback',
			codeChallenge: 'challenge',
			codeChallengeMethod: 'S256',
			state: null,
			resource: resourceUrl,
			scope: [],
			expiresAt: Date.now() + 60_000,
			used: false,
		},
		{},
	);
	await Container.get(UserConsentRepository).saveGrant(userId, clientId, [], {});
}

async function expectGrantCounts(userId: string, count: number) {
	for (const entity of grantEntities) {
		expect(await dataSource.manager.count(entity, { where: { userId } })).toBe(count);
	}
}

it('clears the user grants on deactivation and requires consent after reactivation', async () => {
	await processUsers([], [], [user.id], true);
	expect((await dataSource.manager.findOneByOrFail(User, { id: user.id })).disabled).toBe(true);
	expect(await dataSource.manager.findOneBy(AuthIdentity, { userId: user.id })).toBeNull();
	await expectGrantCounts(user.id, 0);
	await expectGrantCounts(otherUser.id, 1);
	expect(await dataSource.manager.count(OAuthClient, { where: { id: clientId } })).toBe(1);

	user.disabled = false;
	await dataSource.manager.save(user);
	await expect(
		tokens.validateAndRotateRefreshToken(`refresh-${user.id}`, clientId),
	).rejects.toBeInstanceOf(InvalidGrantError);
	await expect(
		Container.get(OAuthAuthorizationCodeService).findAuthorizationCode(`code-${user.id}`, clientId),
	).resolves.toBeNull();
	await expect(
		consentService.tryReuseConsent(user, {
			clientId,
			resource: resourceUrl,
			redirectUri: 'https://example.com/callback',
			codeChallenge: 'challenge',
			state: null,
		}),
	).resolves.toBeNull();
	await expectGrantCounts(user.id, 0);
	await expect(
		server.exchangeAuthorizationCode(mock({ client_id: clientId }), `code-${user.id}`),
	).rejects.toBeInstanceOf(InvalidGrantError);

	sessions.verifySession.mockReturnValue({
		clientId,
		resource: resourceUrl,
		redirectUri: 'https://example.com/callback',
		codeChallenge: 'new-challenge',
		state: null,
	});
	const { redirectUrl } = await consentService.handleConsentDecision('new-session', user, true);
	const code = new URL(redirectUrl).searchParams.get('code')!;
	vi.spyOn(tokens, 'generateTokenPair').mockReturnValue({
		accessToken: 'new-access',
		refreshToken: 'new-refresh',
		audience: resourceUrl,
	});
	const result = await server.exchangeAuthorizationCode(mock({ client_id: clientId }), code);
	expect(result).toMatchObject({ access_token: 'new-access', refresh_token: 'new-refresh' });
	await expectGrantCounts(user.id, 1);
	await expect(
		server.exchangeAuthorizationCode(mock({ client_id: clientId }), code),
	).rejects.toBeInstanceOf(InvalidGrantError);
});

it('keeps the code available when token persistence fails', async () => {
	vi.spyOn(tokens, 'generateTokenPair').mockReturnValue({
		accessToken: 'incomplete-access',
		refreshToken: `refresh-${user.id}`,
		audience: resourceUrl,
	});
	await expect(
		server.exchangeAuthorizationCode(mock({ client_id: clientId }), `code-${user.id}`),
	).rejects.toThrow();
	expect(
		await dataSource.manager.findOneBy(AccessToken, { token: 'incomplete-access' }),
	).toBeNull();
	expect(
		await dataSource.manager.findOneByOrFail(AuthorizationCode, { code: `code-${user.id}` }),
	).toMatchObject({ used: false });
	await expectGrantCounts(user.id, 1);
});

it('checks code expiry again after it acquires the user lock', async () => {
	const afterExpiry = Date.now() + 120_000;
	const original = grants.lockUserForGrant.bind(grants);
	vi.spyOn(grants, 'lockUserForGrant').mockImplementationOnce(async (...args) => {
		const found = await original(...args);
		vi.spyOn(Date, 'now').mockReturnValue(afterExpiry);
		return found;
	});
	await expect(
		server.exchangeAuthorizationCode(mock({ client_id: clientId }), `code-${user.id}`),
	).rejects.toBeInstanceOf(InvalidGrantError);
	expect(
		await dataSource.manager.findOneByOrFail(AuthorizationCode, { code: `code-${user.id}` }),
	).toMatchObject({ used: false });
	await expectGrantCounts(user.id, 1);
});

it('keeps grants when an enabled user changes their profile', async () => {
	user.firstName = 'Updated';
	await dataSource.manager.save(user);
	await expectGrantCounts(user.id, 1);
});

it('rolls back LDAP deactivation when grant cleanup fails', async () => {
	const original = grants.deleteUserGrants.bind(grants);
	vi.spyOn(grants, 'deleteUserGrants').mockImplementationOnce(async (...args) => {
		await original(...args);
		throw new Error('Abort cleanup');
	});
	await expect(processUsers([], [], [user.id], true)).rejects.toThrow('Abort cleanup');
	expect((await dataSource.manager.findOneByOrFail(User, { id: user.id })).disabled).toBe(false);
	expect(await dataSource.manager.findOneBy(AuthIdentity, { userId: user.id })).not.toBeNull();
	await expectGrantCounts(user.id, 1);
	await expectGrantCounts(otherUser.id, 1);
});

it('deactivates LDAP users when the OAuth module is inactive', async () => {
	Container.set(UserDeactivationHooks, new UserDeactivationHooks());
	const cleanup = vi.spyOn(grants, 'deleteUserGrants');
	await processUsers([], [], [user.id], true);
	expect((await dataSource.manager.findOneByOrFail(User, { id: user.id })).disabled).toBe(true);
	expect(await dataSource.manager.findOneBy(AuthIdentity, { userId: user.id })).toBeNull();
	expect(cleanup).not.toHaveBeenCalled();
});

it('clears pre-existing disabled-user grants when the module initializes', async () => {
	await dataSource.manager.update(User, { id: user.id }, { disabled: true });
	await grants.deleteGrantsForDisabledUsers();
	await expectGrantCounts(user.id, 0);
	await expectGrantCounts(otherUser.id, 1);
});

it('clears disabled-user grants across batches while keeping active-user grants', async () => {
	const disabledUsers = await createManyUsers(101, { disabled: true });
	for (const disabledUser of disabledUsers) await seedGrant(disabledUser.id);
	const transactions = vi.spyOn(grants, 'runInTransaction');

	await grants.deleteGrantsForDisabledUsers();

	expect(transactions.mock.calls.length).toBeGreaterThanOrEqual(2);
	for (const entity of grantEntities) {
		expect(
			await dataSource.manager.count(entity, {
				where: { userId: In(disabledUsers.map(({ id }) => id)) },
			}),
		).toBe(0);
	}
	await expectGrantCounts(user.id, 1);
	await expectGrantCounts(otherUser.id, 1);
});

// Separate transactions need separate database connections. SQLite uses one writer.
it.runIf(process.env.DB_TYPE === 'postgresdb')(
	'finishes an admitted rotation before deactivation removes its results',
	async () => {
		const admitted = createDeferredPromise();
		const release = createDeferredPromise();
		const original = grants.lockUserForGrant.bind(grants);
		vi.spyOn(grants, 'lockUserForGrant').mockImplementationOnce(async (...args) => {
			const found = await original(...args);
			admitted.resolve();
			await release.promise;
			return found;
		});
		vi.spyOn(tokens, 'generateTokenPair').mockReturnValue({
			accessToken: randomUUID(),
			refreshToken: randomUUID(),
			audience: resourceUrl,
		});
		const rotating = tokens.validateAndRotateRefreshToken(`refresh-${user.id}`, clientId);
		await admitted.promise;
		const updating = createDeferredPromise<number>();
		const disabling = peerGrants.runInTransaction({}, async (manager, ctx) => {
			const [{ pid }] = await manager.query<Array<{ pid: number }>>(
				'SELECT pg_backend_pid() AS pid',
			);
			updating.resolve(pid);
			await manager.save(User, { id: user.id, disabled: true });
			await peerGrants.deleteUserGrants(user.id, ctx);
		});
		try {
			await expectBlocked(await updating.promise);
		} finally {
			release.resolve();
		}

		await Promise.all([rotating, disabling]);
		await expectGrantCounts(user.id, 0);
	},
);

it.runIf(process.env.DB_TYPE === 'postgresdb')(
	'rejects issuance after a concurrent deactivation commits',
	async () => {
		const disabled = createDeferredPromise();
		const release = createDeferredPromise();
		const disabling = peerGrants.runInTransaction({}, async (manager, ctx) => {
			await manager.save(User, { id: user.id, disabled: true });
			await peerGrants.deleteUserGrants(user.id, ctx);
			disabled.resolve();
			await release.promise;
		});
		await disabled.promise;
		const [{ pid }] = await dataSource.query<Array<{ pid: number }>>(
			'SELECT pg_backend_pid() AS pid',
		);
		const work = vi.fn();
		const issuing = expect(gate.runForActiveUser(user.id, work)).rejects.toBeInstanceOf(
			InvalidGrantError,
		);
		try {
			await expectBlocked(pid);
		} finally {
			release.resolve();
		}
		await Promise.all([disabling, issuing]);
		expect(work).not.toHaveBeenCalled();
		await expectGrantCounts(user.id, 0);
	},
);

it.runIf(process.env.DB_TYPE === 'postgresdb')(
	'finishes deactivation and grant cleanup before a concurrent reactivation',
	async () => {
		const disabled = createDeferredPromise();
		const release = createDeferredPromise();
		const disabling = peerGrants.runInTransaction({}, async (manager, ctx) => {
			await manager.save(User, { id: user.id, disabled: true });
			await peerGrants.deleteUserGrants(user.id, ctx);
			disabled.resolve();
			await release.promise;
		});
		await disabled.promise;
		const [{ pid }] = await dataSource.query<Array<{ pid: number }>>(
			'SELECT pg_backend_pid() AS pid',
		);
		const reactivating = dataSource.manager.update(User, { id: user.id }, { disabled: false });
		try {
			await expectBlocked(pid);
		} finally {
			release.resolve();
			await Promise.all([disabling, reactivating]);
		}
		expect((await dataSource.manager.findOneByOrFail(User, { id: user.id })).disabled).toBe(false);
		await expectGrantCounts(user.id, 0);
		await expectGrantCounts(otherUser.id, 1);
	},
);

async function expectBlocked(pid: number) {
	await vi.waitFor(
		async () => {
			const [result] = await observer!.query<Array<{ blocked: boolean }>>(
				'SELECT cardinality(pg_blocking_pids($1)) > 0 AS blocked',
				[pid],
			);
			expect(result.blocked).toBe(true);
		},
		{ timeout: 5000 },
	);
}
