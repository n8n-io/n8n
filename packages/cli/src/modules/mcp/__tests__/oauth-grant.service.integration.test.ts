import { InvalidGrantError } from '@modelcontextprotocol/sdk/server/auth/errors.js';
import { tokenHandler } from '@modelcontextprotocol/sdk/server/auth/handlers/token.js';
import type { OAuthClientInformationFull } from '@modelcontextprotocol/sdk/shared/auth';
import type { Logger } from '@n8n/backend-common';
import { testDb, testModules } from '@n8n/backend-test-utils';
import { AuthIdentity, User, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource, In } from '@n8n/typeorm';
import express from 'express';
import { mock } from 'jest-mock-extended';
import { createDeferredPromise } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';
import request from 'supertest';

import { processUsers } from '@/ldap.ee/helpers.ee';
import { UserDeactivationHooks } from '@/services/user-deactivation-hooks.service';
import { UserLifecycleTransactionService } from '@/services/user-lifecycle-transaction.service';
import { createManyUsers, createUser } from '@test-integration/db/users';

import { managerForGrant } from '../database/oauth-grant-context';

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
import { McpOAuthAuthorizationCodeService } from '../mcp-oauth-authorization-code.service';
import { McpOAuthConsentService } from '../mcp-oauth-consent.service';
import { McpOAuthService } from '../mcp-oauth-service';
import { McpOAuthTokenService } from '../mcp-oauth-token.service';
import { OAuthGrantService } from '../oauth-grant.service';
import type { OAuthSessionService } from '../oauth-session.service';

let dataSource: DataSource;
let peer: DataSource | undefined;
let observer: DataSource | undefined;
let grants: OAuthGrantRepository;
let peerGrants: OAuthGrantRepository;
let gate: OAuthGrantService;
let tokens: McpOAuthTokenService;
let consentService: McpOAuthConsentService;
let server: McpOAuthService;
const sessions = mock<OAuthSessionService>();
let user: User;
let otherUser: User;
const clientId = 'shared-client';
const client = mock<OAuthClientInformationFull>({ client_id: clientId });
// PostgreSQL concurrency checks require independent connections and row locks.
// eslint-disable-next-line n8n-local-rules/no-skipped-tests
const postgresTest = process.env.DB_TYPE === 'postgresdb' ? it : it.skip;
// The default 1.x SQLite driver shares a connection across callers.
const legacySqliteTest =
	// eslint-disable-next-line n8n-local-rules/no-skipped-tests
	process.env.DB_TYPE === 'sqlite' && process.env.DB_SQLITE_POOL_SIZE === '0' ? it : it.skip;
const grantEntities = [AccessToken, RefreshToken, AuthorizationCode, UserConsent];

beforeAll(async () => {
	await testModules.loadModules(['mcp']);
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
		peerGrants = new OAuthGrantRepository(peer, new UserLifecycleTransactionService(peer));
	}
	gate = Container.get(OAuthGrantService);
	tokens = new McpOAuthTokenService(
		mock<Logger>(),
		mock(),
		Container.get(UserRepository),
		Container.get(AccessTokenRepository),
		Container.get(RefreshTokenRepository),
		gate,
	);
	consentService = new McpOAuthConsentService(
		mock<Logger>(),
		sessions,
		Container.get(OAuthClientRepository),
		Container.get(McpOAuthAuthorizationCodeService),
		gate,
		Container.get(UserConsentRepository),
	);
	server = new McpOAuthService(
		mock(),
		mock(),
		sessions,
		Container.get(OAuthClientRepository),
		tokens,
		Container.get(McpOAuthAuthorizationCodeService),
		Container.get(UserConsentRepository),
		gate,
	);
});

beforeEach(async () => {
	const hooks = new UserDeactivationHooks();
	hooks.register('mcp', async (userId, ctx) => await grants.deleteUserGrants(userId, ctx));
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
	jest.restoreAllMocks();
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
		expiresAt: Date.now() + 60_000,
	});
	await Container.get(AuthorizationCodeRepository).insert({
		code: `code-${userId}`,
		clientId,
		userId,
		redirectUri: 'https://example.com/callback',
		codeChallenge: 'challenge',
		codeChallengeMethod: 'S256',
		state: null,
		expiresAt: Date.now() + 60_000,
		used: false,
	});
	await Container.get(UserConsentRepository).insert({ userId, clientId, grantedAt: Date.now() });
}

async function expectGrantCounts(userId: string, count: number) {
	for (const entity of grantEntities) {
		expect(await dataSource.manager.count(entity, { where: { userId } })).toBe(count);
	}
}

it('clears the user grants on deactivation and requires consent after reactivation', async () => {
	await processUsers([], [], [user.id]);
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
	await expectGrantCounts(user.id, 0);
	await expect(server.exchangeAuthorizationCode(client, `code-${user.id}`)).rejects.toBeInstanceOf(
		InvalidGrantError,
	);

	sessions.verifySession.mockReturnValue({
		clientId,
		redirectUri: 'https://example.com/callback',
		codeChallenge: 'new-challenge',
		state: null,
	});
	const { redirectUrl } = await consentService.handleConsentDecision('new-session', user.id, true);
	const code = new URL(redirectUrl).searchParams.get('code')!;
	jest.spyOn(tokens, 'generateTokenPair').mockReturnValue({
		accessToken: 'new-access',
		refreshToken: 'new-refresh',
	});
	const result = await server.exchangeAuthorizationCode(client, code);
	expect(result).toMatchObject({ access_token: 'new-access', refresh_token: 'new-refresh' });
	await expectGrantCounts(user.id, 1);
	await expect(server.exchangeAuthorizationCode(client, code)).rejects.toBeInstanceOf(
		InvalidGrantError,
	);
});

it.each(['refresh_token', 'authorization_code'] as const)(
	'returns invalid_grant for a revoked %s through the token endpoint',
	async (grantType) => {
		await processUsers([], [], [user.id]);
		const app = express();
		app.use('/token', tokenHandler({ provider: server, rateLimit: false }));
		const response = await request(app)
			.post('/token')
			.type('form')
			.send({
				grant_type: grantType,
				client_id: clientId,
				...(grantType === 'refresh_token'
					? { refresh_token: `refresh-${user.id}` }
					: {
							code: `code-${user.id}`,
							code_verifier: 'verifier',
							redirect_uri: 'https://example.com/callback',
						}),
			});
		expect(response.status).toBe(400);
		expect(response.body).toMatchObject({ error: 'invalid_grant' });
	},
);

it('rejects grants and access for a disabled user', async () => {
	await dataSource.manager.update(User, { id: user.id }, { disabled: true });
	sessions.verifySession.mockReturnValue({
		clientId,
		redirectUri: 'https://example.com/callback',
		codeChallenge: 'challenge',
		state: null,
	});
	await expect(
		consentService.handleConsentDecision('session', user.id, true),
	).rejects.toBeInstanceOf(InvalidGrantError);
	await expect(server.exchangeAuthorizationCode(client, `code-${user.id}`)).rejects.toBeInstanceOf(
		InvalidGrantError,
	);
	await expect(
		tokens.validateAndRotateRefreshToken(`refresh-${user.id}`, clientId),
	).rejects.toBeInstanceOf(InvalidGrantError);
	await expect(
		tokens.saveTokenPair('new-access', 'new-refresh', clientId, user.id),
	).rejects.toBeInstanceOf(InvalidGrantError);
	jest
		.spyOn(tokens, 'verifyAccessToken')
		.mockResolvedValue({ token: 'token', clientId, scopes: [], extra: { userId: user.id } });
	await expect(tokens.verifyOAuthAccessToken('token')).resolves.toEqual({
		user: null,
		context: { reason: 'user_disabled', auth_type: 'oauth' },
	});
	expect(
		await dataSource.manager.findOneByOrFail(AuthorizationCode, { code: `code-${user.id}` }),
	).toMatchObject({ used: false });
	await expectGrantCounts(user.id, 1);
});

it('rejects consent and token storage for a missing user', async () => {
	const missingUserId = randomUUID();
	sessions.verifySession.mockReturnValue({
		clientId,
		redirectUri: 'https://example.com/callback',
		codeChallenge: 'challenge',
		state: null,
	});
	await expect(
		consentService.handleConsentDecision('session', missingUserId, true),
	).rejects.toBeInstanceOf(InvalidGrantError);
	await expect(
		tokens.saveTokenPair('new-access', 'new-refresh', clientId, missingUserId),
	).rejects.toBeInstanceOf(InvalidGrantError);
	await expectGrantCounts(missingUserId, 0);
});

it('keeps the code available when token persistence fails', async () => {
	jest.spyOn(tokens, 'generateTokenPair').mockReturnValue({
		accessToken: 'incomplete-access',
		refreshToken: `refresh-${user.id}`,
	});
	await expect(server.exchangeAuthorizationCode(client, `code-${user.id}`)).rejects.toThrow();
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
	jest.spyOn(grants, 'lockUserForGrant').mockImplementationOnce(async (...args) => {
		const found = await original(...args);
		jest.spyOn(Date, 'now').mockReturnValue(afterExpiry);
		return found;
	});
	await expect(server.exchangeAuthorizationCode(client, `code-${user.id}`)).rejects.toBeInstanceOf(
		InvalidGrantError,
	);
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
	jest.spyOn(grants, 'deleteUserGrants').mockImplementationOnce(async (...args) => {
		await original(...args);
		throw new Error('Abort cleanup');
	});
	await expect(processUsers([], [], [user.id])).rejects.toThrow('Abort cleanup');
	expect((await dataSource.manager.findOneByOrFail(User, { id: user.id })).disabled).toBe(false);
	expect(await dataSource.manager.findOneBy(AuthIdentity, { userId: user.id })).not.toBeNull();
	await expectGrantCounts(user.id, 1);
	await expectGrantCounts(otherUser.id, 1);
});

it('deactivates LDAP users when the OAuth module is inactive', async () => {
	Container.set(UserDeactivationHooks, new UserDeactivationHooks());
	const cleanup = jest.spyOn(grants, 'deleteUserGrants');
	await processUsers([], [], [user.id]);
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
	const transactions = jest.spyOn(grants.manager, 'transaction');

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

legacySqliteTest(
	'finishes rotation before LDAP deactivation starts on the shared connection',
	async () => {
		const consumed = createDeferredPromise();
		const release = createDeferredPromise();
		const originalLock = grants.lockUserForGrant.bind(grants);
		jest.spyOn(grants, 'lockUserForGrant').mockImplementationOnce(async (userId, ctx) => {
			const found = await originalLock(userId, ctx);
			const manager = managerForGrant(ctx, dataSource.manager);
			const originalDelete = manager.delete.bind(manager);
			jest.spyOn(manager, 'delete').mockImplementationOnce(async (...args) => {
				const result = await originalDelete(...args);
				consumed.resolve();
				await release.promise;
				return result;
			});
			return found;
		});
		jest.spyOn(tokens, 'generateTokenPair').mockReturnValue({
			accessToken: 'rotated-access',
			refreshToken: 'rotated-refresh',
		});
		const transactions = jest.spyOn(dataSource.manager, 'transaction');
		const rotating = tokens.validateAndRotateRefreshToken(`refresh-${user.id}`, clientId);
		await consumed.promise;
		const disabling = processUsers([], [], [user.id]);
		try {
			await new Promise<void>((resolve) => setImmediate(resolve));
			expect(transactions).toHaveBeenCalledTimes(1);
		} finally {
			release.resolve();
			await Promise.all([rotating, disabling]);
		}
		expect((await dataSource.manager.findOneByOrFail(User, { id: user.id })).disabled).toBe(true);
		await expectGrantCounts(user.id, 0);
		await expectGrantCounts(otherUser.id, 1);
	},
);

legacySqliteTest(
	'waits for LDAP deactivation before admitting a grant on the shared connection',
	async () => {
		const cleaned = createDeferredPromise();
		const release = createDeferredPromise();
		const originalCleanup = grants.deleteUserGrants.bind(grants);
		jest.spyOn(grants, 'deleteUserGrants').mockImplementationOnce(async (...args) => {
			await originalCleanup(...args);
			cleaned.resolve();
			await release.promise;
		});
		const transactions = jest.spyOn(dataSource.manager, 'transaction');
		const disabling = processUsers([], [], [user.id]);
		await cleaned.promise;
		const work = jest.fn();
		const issuing = expect(gate.runForActiveUser(user.id, work)).rejects.toBeInstanceOf(
			InvalidGrantError,
		);
		try {
			await new Promise<void>((resolve) => setImmediate(resolve));
			expect(transactions).toHaveBeenCalledTimes(1);
		} finally {
			release.resolve();
			await Promise.all([disabling, issuing]);
		}
		expect(work).not.toHaveBeenCalled();
		await expectGrantCounts(user.id, 0);
	},
);

// Separate transactions need separate database connections. SQLite uses one writer.
postgresTest('finishes an admitted rotation before deactivation removes its results', async () => {
	const admitted = createDeferredPromise();
	const release = createDeferredPromise();
	const original = grants.lockUserForGrant.bind(grants);
	jest.spyOn(grants, 'lockUserForGrant').mockImplementationOnce(async (...args) => {
		const found = await original(...args);
		admitted.resolve();
		await release.promise;
		return found;
	});
	jest.spyOn(tokens, 'generateTokenPair').mockReturnValue({
		accessToken: randomUUID(),
		refreshToken: randomUUID(),
	});
	const rotating = tokens.validateAndRotateRefreshToken(`refresh-${user.id}`, clientId);
	await admitted.promise;
	const updating = createDeferredPromise<number>();
	const disabling = peerGrants.manager.transaction(async (manager) => {
		const [{ pid }] = await manager.query<Array<{ pid: number }>>('SELECT pg_backend_pid() AS pid');
		updating.resolve(pid);
		await manager.save(User, { id: user.id, disabled: true });
		await peerGrants.deleteUserGrants(user.id, manager);
	});
	try {
		await expectBlocked(await updating.promise);
	} finally {
		release.resolve();
	}

	await Promise.all([rotating, disabling]);
	await expectGrantCounts(user.id, 0);
});

postgresTest('rejects issuance after a concurrent deactivation commits', async () => {
	const disabled = createDeferredPromise();
	const release = createDeferredPromise();
	const disabling = peerGrants.manager.transaction(async (manager) => {
		await manager.save(User, { id: user.id, disabled: true });
		await peerGrants.deleteUserGrants(user.id, manager);
		disabled.resolve();
		await release.promise;
	});
	await disabled.promise;
	const [{ pid }] = await dataSource.query<Array<{ pid: number }>>(
		'SELECT pg_backend_pid() AS pid',
	);
	const work = jest.fn();
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
});

postgresTest(
	'finishes deactivation and grant cleanup before a concurrent reactivation',
	async () => {
		const disabled = createDeferredPromise();
		const release = createDeferredPromise();
		const disabling = peerGrants.manager.transaction(async (manager) => {
			await manager.save(User, { id: user.id, disabled: true });
			await peerGrants.deleteUserGrants(user.id, manager);
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
	const deadline = Date.now() + 5000;
	while (Date.now() < deadline) {
		const [result] = await observer!.query<Array<{ blocked: boolean }>>(
			'SELECT cardinality(pg_blocking_pids($1)) > 0 AS blocked',
			[pid],
		);
		if (result.blocked) return;
		await new Promise((resolve) => setTimeout(resolve, 25));
	}
	throw new Error('Expected the transaction to wait for a row lock');
}
