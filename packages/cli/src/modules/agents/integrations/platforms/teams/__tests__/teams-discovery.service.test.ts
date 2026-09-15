import { mock } from 'vitest-mock-extended';
import type { Logger } from '@n8n/backend-common';
import type { OutboundHttp } from '@n8n/backend-network';
import { generateKeyPairSync, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { CacheService } from '@/services/cache/cache.service';

import { TeamsDiscoveryService } from '../teams-discovery.service';

const SCOPE = { projectId: 'project-1', agentId: 'agent-1' };
const CLIENT_ID = '11111111-2222-3333-4444-555555555555';
const TENANT_ID = '99999999-8888-7777-6666-555555555555';
const ISSUER = 'https://api.botframework.com';

/** Mirrors the Bot Framework signer NODE-5964 already uses for inbound activities. */
function buildSigner() {
	const keyId = randomUUID();
	const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
	const jwk = publicKey.export({ format: 'jwk' });

	return {
		jwks: { keys: [{ ...jwk, kid: keyId, use: 'sig', alg: 'RS256' }] },
		sign: (claims: Record<string, unknown> = {}) =>
			jwt.sign({ aud: CLIENT_ID, iss: ISSUER, ...claims }, privateKey, {
				algorithm: 'RS256',
				expiresIn: '1h',
				keyid: keyId,
			}),
	};
}

const teamsActivity = {
	type: 'message',
	conversation: { id: 'a:1dm', conversationType: 'personal', tenantId: TENANT_ID },
	channelData: { tenant: { id: TENANT_ID } },
};

/** Web Chat carries no tenant, which is the case the stepper must survive. */
const webChatActivity = { type: 'message', conversation: { id: 'webchat' } };

describe('TeamsDiscoveryService', () => {
	const signer = buildSigner();
	let cache: Map<string, string>;
	let cacheService: ReturnType<typeof mock<CacheService>>;
	let credentialsService: ReturnType<typeof mock<CredentialsService>>;
	let service: TeamsDiscoveryService;

	const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

	beforeEach(() => {
		cache = new Map();
		cacheService = mock<CacheService>();
		cacheService.get.mockImplementation(async (key: string) => cache.get(key));
		cacheService.set.mockImplementation(async (key: string, value: string) => {
			cache.set(key, value);
		});
		cacheService.delete.mockImplementation(async (key: string) => {
			cache.delete(key);
		});

		credentialsService = mock<CredentialsService>();
		credentialsService.findAllCredentialIdsForProject.mockResolvedValue([]);

		const outboundHttp = mock<OutboundHttp>();
		outboundHttp.requests.mockReturnValue(
			mock({ request: async () => ({ body: signer.jwks }) }) as never,
		);

		service = new TeamsDiscoveryService(
			cacheService,
			credentialsService,
			outboundHttp,
			mock<Logger>(),
		);
	});

	describe('before a window is opened', () => {
		it('reports expired', async () => {
			expect(await service.getState(SCOPE)).toEqual({ status: 'expired' });
		});

		it('ignores an activity, however well signed', async () => {
			const recorded = await service.record(SCOPE, bearer(signer.sign()), teamsActivity);

			expect(recorded).toBe(false);
			expect(await service.getState(SCOPE)).toEqual({ status: 'expired' });
		});
	});

	describe('with a window open', () => {
		beforeEach(async () => await service.open(SCOPE));

		it('waits until an activity arrives', async () => {
			expect(await service.getState(SCOPE)).toEqual({ status: 'waiting' });
		});

		it('picks the client and tenant ID out of a signed Teams activity', async () => {
			const recorded = await service.record(SCOPE, bearer(signer.sign()), teamsActivity);

			expect(recorded).toBe(true);
			expect(await service.getState(SCOPE)).toEqual({
				status: 'found',
				clientId: CLIENT_ID,
				tenantId: TENANT_ID,
				existingCredentialId: null,
			});
		});

		it('still picks the client ID up when the activity carries no tenant', async () => {
			await service.record(SCOPE, bearer(signer.sign()), webChatActivity);

			expect(await service.getState(SCOPE)).toMatchObject({
				status: 'found',
				clientId: CLIENT_ID,
				tenantId: null,
			});
		});

		it.each([
			['an unsigned activity', () => ({})],
			['a bearer token that is not a JWT', () => bearer('not-a-jwt')],
			['a token signed by someone else', () => bearer(buildSigner().sign())],
			[
				'a token from the wrong issuer',
				() => bearer(signer.sign({ iss: 'https://evil.example.com' })),
			],
		])('refuses %s', async (_label, headers) => {
			const recorded = await service.record(SCOPE, headers(), teamsActivity);

			expect(recorded).toBe(false);
			expect(await service.getState(SCOPE)).toEqual({ status: 'waiting' });
		});

		it('offers an existing credential that already holds these values', async () => {
			credentialsService.findAllCredentialIdsForProject.mockResolvedValue([
				mock({ id: 'other', type: 'slackApi' }),
				mock({ id: 'match', type: 'microsoftEntraServicePrincipalApi' }),
			]);
			credentialsService.decrypt.mockResolvedValue({
				clientId: CLIENT_ID,
				tenantId: TENANT_ID,
			});

			await service.record(SCOPE, bearer(signer.sign()), teamsActivity);

			expect(await service.getState(SCOPE)).toMatchObject({ existingCredentialId: 'match' });
		});

		it('does not offer a credential for a different bot', async () => {
			credentialsService.findAllCredentialIdsForProject.mockResolvedValue([
				mock({ id: 'other-bot', type: 'microsoftEntraServicePrincipalApi' }),
			]);
			credentialsService.decrypt.mockResolvedValue({
				clientId: 'a-different-client-id',
				tenantId: TENANT_ID,
			});

			await service.record(SCOPE, bearer(signer.sign()), teamsActivity);

			expect(await service.getState(SCOPE)).toMatchObject({ existingCredentialId: null });
		});

		it('stops listening when the step is closed', async () => {
			await service.close(SCOPE);

			expect(await service.record(SCOPE, bearer(signer.sign()), teamsActivity)).toBe(false);
			expect(await service.getState(SCOPE)).toEqual({ status: 'expired' });
		});

		it('keeps windows for different agents apart', async () => {
			const other = { projectId: 'project-1', agentId: 'agent-2' };

			await service.record(SCOPE, bearer(signer.sign()), teamsActivity);

			expect(await service.getState(other)).toEqual({ status: 'expired' });
		});

		it('never stores the token it verified', async () => {
			await service.record(SCOPE, bearer(signer.sign()), teamsActivity);

			expect([...cache.values()].join('')).not.toContain('eyJ');
		});
	});
});
