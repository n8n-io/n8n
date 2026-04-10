process.env.N8N_ENV_FEAT_TOKEN_EXCHANGE = 'true';

import { generateKeyPairSync, randomUUID } from 'node:crypto';

import { testDb } from '@n8n/backend-test-utils';
import { AuthIdentity, AuthIdentityRepository, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import jwt from 'jsonwebtoken';

import { InstanceSettings } from 'n8n-core';

import { EventService } from '@/events/event.service';
import { TokenExchangeConfig } from '@/modules/token-exchange/token-exchange.config';

import { createOwner, createUser } from '../shared/db/users';
import * as utils from '../shared/utils';

// --- RSA key pair for signing test JWTs ---

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
	modulusLength: 2048,
	publicKeyEncoding: { type: 'spki', format: 'pem' },
	privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const TEST_KID = 'embed-test-kid';
const TEST_ISSUER = 'https://embed-test-issuer.example.com';
const TEST_AUDIENCE = 'n8n';

const trustedKeysJson = JSON.stringify([
	{
		type: 'static',
		kid: TEST_KID,
		algorithms: ['RS256'],
		key: publicKey,
		issuer: TEST_ISSUER,
		expectedAudience: TEST_AUDIENCE,
		allowedRoles: ['global:member', 'global:admin'],
	},
]);

// --- Seed config BEFORE setupTestServer so module init() picks it up ---

const config = Container.get(TokenExchangeConfig);
config.trustedKeys = trustedKeysJson;
config.embedEnabled = true;

Container.get(InstanceSettings).markAsLeader();

const testServer = utils.setupTestServer({
	endpointGroups: ['auth'],
	enabledFeatures: ['feat:tokenExchange'],
	modules: ['token-exchange'],
});

function signEmbedToken(overrides: Record<string, unknown> = {}): string {
	const now = Math.floor(Date.now() / 1000);
	const payload = {
		sub: `ext-${randomUUID()}`,
		iss: TEST_ISSUER,
		aud: TEST_AUDIENCE,
		iat: now,
		exp: now + 30,
		jti: randomUUID(),
		email: `embed-${randomUUID()}@test.example.com`,
		given_name: 'Test',
		family_name: 'User',
		...overrides,
	};
	return jwt.sign(payload, privateKey, {
		algorithm: 'RS256',
		header: { alg: 'RS256', kid: TEST_KID, typ: 'JWT' },
	});
}

let eventService: EventService;

beforeAll(() => {
	eventService = Container.get(EventService);
});

beforeEach(async () => {
	await testDb.truncate(['AuthIdentity', 'ProjectRelation', 'Project', 'User']);
	// Every test needs an owner for the license check in issueCookie
	await createOwner();
	jest.restoreAllMocks();
});

describe('Embed Auth API (integration)', () => {
	it('GET /auth/embed — valid token sets cookie, emits audit event, and redirects', async () => {
		const sub = `ext-${randomUUID()}`;
		const token = signEmbedToken({ sub, email: 'get-test@test.example.com' });
		const emitSpy = jest.spyOn(eventService, 'emit');

		const res = await testServer.authlessAgent
			.get(`/auth/embed?token=${encodeURIComponent(token)}`)
			.redirects(0)
			.expect(302);

		// Cookie assertions
		const cookies = res.headers['set-cookie'];
		expect(cookies).toBeDefined();
		const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies;
		expect(cookieStr).toContain('HttpOnly');
		expect(cookieStr).toMatch(/SameSite=None/i);
		expect(cookieStr).toContain('Secure');

		// Audit event
		expect(emitSpy).toHaveBeenCalledWith(
			'embed-login',
			expect.objectContaining({ subject: sub, issuer: TEST_ISSUER }),
		);
	});

	it('POST /auth/embed — valid token sets cookie and redirects', async () => {
		const token = signEmbedToken({ email: 'post-test@test.example.com' });

		const res = await testServer.authlessAgent
			.post('/auth/embed')
			.send({ token })
			.redirects(0)
			.expect(302);

		const cookies = res.headers['set-cookie'];
		expect(cookies).toBeDefined();
	});

	it('rejects expired, replayed, bad-signature, and long-lived tokens', async () => {
		const now = Math.floor(Date.now() / 1000);

		// 1. Expired token
		const expired = signEmbedToken({ iat: now - 120, exp: now - 60 });
		await testServer.authlessAgent
			.get(`/auth/embed?token=${encodeURIComponent(expired)}`)
			.expect(401);

		// 2. Replayed token (same JTI used twice)
		const jti = randomUUID();
		const first = signEmbedToken({ jti, email: 'replay@test.example.com' });
		await testServer.authlessAgent
			.get(`/auth/embed?token=${encodeURIComponent(first)}`)
			.redirects(0)
			.expect(302);
		const replayed = signEmbedToken({ jti, email: 'replay@test.example.com' });
		await testServer.authlessAgent
			.get(`/auth/embed?token=${encodeURIComponent(replayed)}`)
			.expect(401);

		// 3. Invalid signature (signed with a different key)
		const { privateKey: otherKey } = generateKeyPairSync('rsa', {
			modulusLength: 2048,
			privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
			publicKeyEncoding: { type: 'spki', format: 'pem' },
		});
		const badSig = jwt.sign(
			{
				sub: 'x',
				iss: TEST_ISSUER,
				aud: TEST_AUDIENCE,
				iat: now,
				exp: now + 30,
				jti: randomUUID(),
			},
			otherKey,
			{ algorithm: 'RS256', header: { alg: 'RS256', kid: TEST_KID, typ: 'JWT' } },
		);
		await testServer.authlessAgent
			.get(`/auth/embed?token=${encodeURIComponent(badSig)}`)
			.expect(401);

		// 4. Token lifetime exceeds 60s
		const longLived = signEmbedToken({ iat: now, exp: now + 120 });
		await testServer.authlessAgent
			.get(`/auth/embed?token=${encodeURIComponent(longLived)}`)
			.expect(401);
	});

	it('JIT provisions a new user on first login', async () => {
		const sub = `ext-jit-${randomUUID()}`;
		const email = `jit-${randomUUID()}@test.example.com`;
		const token = signEmbedToken({ sub, email, given_name: 'Jay', family_name: 'Tee' });

		await testServer.authlessAgent
			.get(`/auth/embed?token=${encodeURIComponent(token)}`)
			.redirects(0)
			.expect(302);

		// Verify user was created
		const userRepo = Container.get(UserRepository);
		const user = await userRepo.findOneBy({ email });
		expect(user).toBeDefined();
		expect(user!.firstName).toBe('Jay');
		expect(user!.lastName).toBe('Tee');

		// Verify auth identity linked
		const identityRepo = Container.get(AuthIdentityRepository);
		const identity = await identityRepo.findOneBy({
			providerId: sub,
			providerType: 'token-exchange',
		});
		expect(identity).toBeDefined();
		expect(identity!.userId).toBe(user!.id);
	});

	it('syncs profile for returning user', async () => {
		const sub = `ext-sync-${randomUUID()}`;
		const user = await createUser({
			email: `sync-${randomUUID()}@test.example.com`,
			firstName: 'Old',
			lastName: 'Name',
		});

		// Link auth identity
		const identityRepo = Container.get(AuthIdentityRepository);
		await identityRepo.save(AuthIdentity.create(user, sub, 'token-exchange'));

		const token = signEmbedToken({
			sub,
			email: user.email,
			given_name: 'New',
			family_name: 'Last',
		});

		await testServer.authlessAgent
			.get(`/auth/embed?token=${encodeURIComponent(token)}`)
			.redirects(0)
			.expect(302);

		// Verify profile updated
		const userRepo = Container.get(UserRepository);
		const updated = await userRepo.findOneBy({ id: user.id });
		expect(updated!.firstName).toBe('New');
		expect(updated!.lastName).toBe('Last');
	});
});
