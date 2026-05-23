import { testDb } from '@n8n/backend-test-utils';
import { AuthIdentityRepository, ProjectRepository, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { generateKeyPairSync, randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';

import { TrustedKeyService } from '@/modules/token-exchange/services/trusted-key.service';
import { TokenExchangeConfig } from '@/modules/token-exchange/token-exchange.config';
import { TOKEN_EXCHANGE_GRANT_TYPE } from '@/modules/token-exchange/token-exchange.schemas';
import {
	TOKEN_EXCHANGE_ISSUER,
	type IssuedJwtPayload,
	type TokenExchangeSuccessResponse,
} from '@/modules/token-exchange/token-exchange.types';
import { JwtService } from '@/services/jwt.service';
import { InstanceSettings } from 'n8n-core';

import { createUser } from '../shared/db/users';
import * as utils from '../shared/utils';

// Must be set before module init reads the env var.
process.env.N8N_ENV_FEAT_TOKEN_EXCHANGE = 'true';

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
	modulusLength: 2048,
	publicKeyEncoding: { type: 'spki', format: 'pem' },
	privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const ISSUER = 'https://issuer.test';
const KID = 'test-kid';

function makeExternalJwt(
	overrides: Partial<{
		sub: string;
		iss: string;
		aud: string;
		exp: number;
		jti: string;
		email: string;
		given_name: string;
		family_name: string;
		role: string;
	}> = {},
): string {
	const now = Math.floor(Date.now() / 1000);
	return jwt.sign(
		{
			sub: `ext-${randomUUID().slice(0, 8)}`,
			iss: ISSUER,
			aud: 'n8n',
			iat: now,
			exp: now + 300,
			jti: randomUUID(),
			...overrides,
		},
		privateKey,
		{ algorithm: 'RS256', keyid: KID },
	);
}

const testServer = utils.setupTestServer({
	endpointGroups: ['auth'],
	enabledFeatures: ['feat:tokenExchange'],
	modules: ['token-exchange'],
});

let config: TokenExchangeConfig;
let jwtService: JwtService;

beforeAll(async () => {
	// TrustedKeyService.initialize() only runs on the leader instance.
	const instanceSettings = Container.get(InstanceSettings);
	Object.defineProperty(instanceSettings, 'isLeader', { value: true, configurable: true });

	config = Container.get(TokenExchangeConfig);
	config.enabled = true;
	config.trustedKeys = JSON.stringify([
		{
			type: 'static',
			kid: KID,
			algorithms: ['RS256'],
			key: publicKey,
			issuer: ISSUER,
			expectedAudience: 'n8n',
			allowedRoles: ['global:member', 'global:admin'],
		},
	]);

	await Container.get(TrustedKeyService).initialize();

	jwtService = Container.get(JwtService);
});

beforeEach(async () => {
	await testDb.truncate([
		'TokenExchangeJti',
		'TrustedKeyEntity',
		'TrustedKeySourceEntity',
		'AuthIdentity',
		'ProjectRelation',
		'Project',
		'User',
	]);
	config.enabled = true;
	config.maxTokenTtl = 900;

	// Re-initialize keys after truncation clears the trusted key tables.
	await Container.get(TrustedKeyService).initialize();
});

afterEach(() => {
	Container.get(TrustedKeyService).stopRefresh();
});

const postToken = (body: Record<string, string>) =>
	testServer.authlessAgent.post('/auth/oauth/token').send(body);

describe('POST /auth/oauth/token', () => {
	it('should exchange a subject token, provision the user, and return a valid access token', async () => {
		const email = 'jit-user@example.com';
		const token = makeExternalJwt({
			sub: 'ext-jit-1',
			email,
			given_name: 'Jane',
			family_name: 'Doe',
			role: 'global:admin',
		});

		const response = await postToken({
			grant_type: TOKEN_EXCHANGE_GRANT_TYPE,
			subject_token: token,
		}).expect(200);

		const body = response.body as TokenExchangeSuccessResponse;

		// RFC 8693 response format
		expect(body).toEqual(
			expect.objectContaining({
				access_token: expect.any(String),
				token_type: 'Bearer',
				expires_in: expect.any(Number),
				issued_token_type: 'urn:ietf:params:oauth:token-type:access_token',
			}),
		);

		// Issued token is valid and has correct claims
		const decoded = jwtService.verify<IssuedJwtPayload>(body.access_token);
		expect(decoded.iss).toBe(TOKEN_EXCHANGE_ISSUER);
		expect(decoded.sub).toEqual(expect.any(String));
		expect(decoded.act).toBeUndefined();
		expect(decoded.scope).toBeUndefined();
		expect(decoded.resource).toBeUndefined();

		// User provisioned in DB with correct fields
		const userRepo = Container.get(UserRepository);
		const user = await userRepo.findOne({
			where: { email },
			relations: ['role'],
		});
		expect(user).not.toBeNull();
		expect(user!.firstName).toBe('Jane');
		expect(user!.lastName).toBe('Doe');
		expect(user!.role.slug).toBe('global:admin');
		expect(decoded.sub).toBe(user!.id);

		// AuthIdentity linked
		const identity = await Container.get(AuthIdentityRepository).findOne({
			where: { providerId: 'ext-jit-1', providerType: 'token-exchange' },
		});
		expect(identity).not.toBeNull();
		expect(identity!.userId).toBe(user!.id);

		// Personal project created
		const project = await Container.get(ProjectRepository).getPersonalProjectForUser(user!.id);
		expect(project).toBeDefined();
	});

	it('should exchange subject + actor tokens and include act claim in issued token', async () => {
		// Pre-create subject user to test the existing-user path
		const subjectUser = await createUser({ email: 'subject@example.com' });

		const subjectToken = makeExternalJwt({
			sub: 'ext-subject',
			email: 'subject@example.com',
		});
		const actorToken = makeExternalJwt({
			sub: 'ext-actor',
			email: 'actor@example.com',
		});

		const response = await postToken({
			grant_type: TOKEN_EXCHANGE_GRANT_TYPE,
			subject_token: subjectToken,
			actor_token: actorToken,
		}).expect(200);

		const decoded = jwtService.verify<IssuedJwtPayload>(
			(response.body as TokenExchangeSuccessResponse).access_token,
		);

		// Subject is the existing user
		expect(decoded.sub).toBe(subjectUser.id);

		// Act claim present with JIT-provisioned actor user ID
		expect(decoded.act).toBeDefined();
		expect(decoded.act!.sub).toEqual(expect.any(String));
		expect(decoded.act!.sub).not.toBe(decoded.sub);

		// Both users exist in DB
		const userRepo = Container.get(UserRepository);
		const actorUser = await userRepo.findOneBy({ id: decoded.act!.sub });
		expect(actorUser).not.toBeNull();
		expect(actorUser!.email).toBe('actor@example.com');
	});

	it('should pass through scope and split resource into array in issued token', async () => {
		const token = makeExternalJwt({
			sub: 'ext-scope-test',
			email: 'scope-test@example.com',
		});

		const response = await postToken({
			grant_type: TOKEN_EXCHANGE_GRANT_TYPE,
			subject_token: token,
			scope: 'workflow:read',
			resource: 'https://api.a.com https://api.b.com',
		}).expect(200);

		const decoded = jwtService.verify<IssuedJwtPayload>(
			(response.body as TokenExchangeSuccessResponse).access_token,
		);
		expect(decoded.scope).toBe('workflow:read');
		expect(decoded.resource).toEqual(['https://api.a.com', 'https://api.b.com']);
	});

	it('should enforce expiry as min of subject.exp and maxTokenTtl', async () => {
		config.maxTokenTtl = 60;

		const token = makeExternalJwt({
			sub: 'ext-expiry',
			email: 'expiry@example.com',
			exp: Math.floor(Date.now() / 1000) + 86400, // far future
		});

		const response = await postToken({
			grant_type: TOKEN_EXCHANGE_GRANT_TYPE,
			subject_token: token,
		}).expect(200);

		expect((response.body as TokenExchangeSuccessResponse).expires_in).toBeLessThanOrEqual(60);
	});

	it('should reject a replayed token (same jti)', async () => {
		const token = makeExternalJwt({
			sub: 'ext-replay',
			email: 'replay@example.com',
		});

		// First exchange succeeds
		await postToken({
			grant_type: TOKEN_EXCHANGE_GRANT_TYPE,
			subject_token: token,
		}).expect(200);

		// Second exchange with identical token (same jti) fails
		const response = await postToken({
			grant_type: TOKEN_EXCHANGE_GRANT_TYPE,
			subject_token: token,
		}).expect(400);

		expect((response.body as { error: string }).error).toBe('invalid_grant');
	});

	it('should return 400 unsupported_grant_type for wrong or missing grant_type', async () => {
		const response = await postToken({
			subject_token: 'some-token',
		}).expect(400);

		expect((response.body as { error: string }).error).toBe('unsupported_grant_type');
	});

	it('should return 400 invalid_request when subject_token is missing', async () => {
		const response = await postToken({
			grant_type: TOKEN_EXCHANGE_GRANT_TYPE,
		}).expect(400);

		expect((response.body as { error: string }).error).toBe('invalid_request');
	});

	it('should reject a token too close to expiry', async () => {
		const token = makeExternalJwt({
			sub: 'ext-near-expiry',
			email: 'near-expiry@example.com',
			exp: Math.floor(Date.now() / 1000) + 3,
		});

		const response = await postToken({
			grant_type: TOKEN_EXCHANGE_GRANT_TYPE,
			subject_token: token,
		}).expect(400);

		expect((response.body as { error: string }).error).toBe('invalid_grant');
	});

	it('should return 400 invalid_request when scope exceeds max length', async () => {
		const token = makeExternalJwt({
			sub: 'ext-scope-limit',
			email: 'scope-limit@example.com',
		});

		const response = await postToken({
			grant_type: TOKEN_EXCHANGE_GRANT_TYPE,
			subject_token: token,
			scope: 'a'.repeat(1025),
		}).expect(400);

		expect((response.body as { error: string }).error).toBe('invalid_request');
	});

	it('should return 501 when token exchange is disabled', async () => {
		config.enabled = false;

		const response = await postToken({
			grant_type: TOKEN_EXCHANGE_GRANT_TYPE,
			subject_token: 'any',
		}).expect(501);

		expect((response.body as { error: string }).error).toBe('server_error');
	});
});
