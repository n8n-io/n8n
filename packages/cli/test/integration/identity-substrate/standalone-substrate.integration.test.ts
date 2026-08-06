process.env.N8N_ENV_FEAT_IDENTITY_SUBSTRATE = 'true';

import { testDb } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import jwt from 'jsonwebtoken';
import { InstanceSettings } from 'n8n-core';
import { generateKeyPairSync, randomUUID } from 'node:crypto';

import { IdentitySubstrateConfig } from '@/modules/identity-substrate/identity-substrate.config';
import { ExternalTokenVerifierProxy } from '@/services/external-token-verifier-proxy.service';

import * as utils from '../shared/utils';

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
	modulusLength: 2048,
	publicKeyEncoding: { type: 'spki', format: 'pem' },
	privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const ISSUER = 'https://standalone-substrate-issuer.example.com';
const AUDIENCE = 'n8n';
const KID = 'standalone-substrate-kid';

// Seed config BEFORE setupTestServer so module init() picks it up - only
// `identity-substrate` is loaded below, `token-exchange` is not.
const config = Container.get(IdentitySubstrateConfig);
config.trustedKeys = JSON.stringify([
	{
		type: 'static',
		kid: KID,
		algorithms: ['RS256'],
		key: publicKey,
		issuer: ISSUER,
		expectedAudience: AUDIENCE,
	},
]);

Container.get(InstanceSettings).markAsLeader();

const testServer = utils.setupTestServer({
	endpointGroups: ['auth'],
	enabledFeatures: ['feat:identitySubstrate'],
	// Deliberately does NOT include 'token-exchange' - proves the substrate
	// is independently useful without licensing/enabling RFC 8693 consumer.
	modules: ['identity-substrate'],
});

/**
 * Smoke test for the ticket's central design goal: a customer who only wants
 * inbound-IdP identity on triggers/webhooks should never have to license or
 * enable RFC 8693 token exchange. `identity-substrate` enabled alone must
 * give a fully working verifier while the token-exchange consumer's routes
 * are entirely absent (not just disabled-with-a-501 - never registered).
 */
describe('identity-substrate standalone (token-exchange consumer not loaded)', () => {
	afterAll(async () => {
		await testDb.terminate();
	});

	it('never registers the RFC 8693 token exchange route', async () => {
		await testServer.authlessAgent
			.post('/auth/oauth/token')
			.send({ grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange' })
			.expect(404);
	});

	it('never registers the embed-auth login route', async () => {
		await testServer.authlessAgent.get('/auth/embed?token=anything').expect(404);
	});

	it('still resolves an external token via ExternalTokenVerifierProxy', async () => {
		const now = Math.floor(Date.now() / 1000);
		const token = jwt.sign(
			{
				sub: 'ext-standalone-user',
				iss: ISSUER,
				aud: AUDIENCE,
				iat: now,
				exp: now + 300,
				jti: randomUUID(),
			},
			privateKey,
			{ algorithm: 'RS256', keyid: KID },
		);

		const result = await Container.get(ExternalTokenVerifierProxy).verifyExternalToken(
			token,
			AUDIENCE,
		);

		expect(result.claim).toMatchObject({ issuer: ISSUER, subject: 'ext-standalone-user' });
	});
});
