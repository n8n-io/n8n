import type { Logger } from '@n8n/backend-common';
import type { OutboundHttp } from '@n8n/backend-network';
import type { CredentialsEntity, CredentialsRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { CredentialsOverwrites } from '@/credentials-overwrites';
import { BadRequestError } from '@n8n/errors';

import { MicrosoftTeamsManagerOAuth2Api } from 'n8n-nodes-base/credentials/MicrosoftTeamsManagerOAuth2Api.credentials';

import {
	AZURE_RESOURCE,
	GRAPH_RESOURCE,
	RESOURCE_SCOPES,
	TeamsManagerTokenService,
} from '../teams-manager-token.service';
import { REQUIRED_MANAGER_SCOPES } from '../teams-managed-setup.service';

const credential = mock<CredentialsEntity>({
	id: 'cred-1',
	name: 'Microsoft organization',
	type: 'microsoftTeamsManagerOAuth2Api',
});

/** The form body Entra was actually sent, parsed back out. */
const sentBody = (request: ReturnType<typeof vi.fn>) =>
	new URLSearchParams(String(request.mock.calls[0][0].body));

describe('TeamsManagerTokenService', () => {
	let credentialsService: ReturnType<typeof mock<CredentialsService>>;
	let credentialsRepository: ReturnType<typeof mock<CredentialsRepository>>;
	let credentialsOverwrites: ReturnType<typeof mock<CredentialsOverwrites>>;
	let request: ReturnType<typeof vi.fn>;
	let service: TeamsManagerTokenService;

	const respondWith = (statusCode: number, body: Record<string, unknown>) =>
		request.mockResolvedValue({ statusCode, body });

	beforeEach(() => {
		credentialsService = mock<CredentialsService>();
		credentialsRepository = mock<CredentialsRepository>();
		credentialsRepository.findOneBy.mockResolvedValue(null);
		credentialsOverwrites = mock<CredentialsOverwrites>();
		request = vi.fn();
		const outboundHttp = mock<OutboundHttp>();
		outboundHttp.requests.mockReturnValue(mock({ request }) as never);

		service = new TeamsManagerTokenService(
			credentialsService,
			credentialsRepository,
			credentialsOverwrites,
			outboundHttp,
			mock<Logger>(),
		);

		credentialsOverwrites.getOverwrites.mockReturnValue({
			clientId: 'client-id',
			clientSecret: 'client-secret',
		} as never);
		credentialsService.decrypt.mockResolvedValue({
			oauthTokenData: { refresh_token: 'refresh-1', scope: 'openid' },
		} as never);
		credentialsService.createEncryptedData.mockResolvedValue({ data: 'encrypted' } as never);
		respondWith(200, { access_token: 'graph-token' });
	});

	it('redeems the stored refresh token for a Graph token', async () => {
		await expect(service.acquire(credential, GRAPH_RESOURCE)).resolves.toBe('graph-token');

		const body = sentBody(request);
		expect(body.get('grant_type')).toBe('refresh_token');
		expect(body.get('refresh_token')).toBe('refresh-1');
		expect(body.get('scope')).toContain('https://graph.microsoft.com/Application.ReadWrite.All');
	});

	it('redeems the same sign-in for an Azure token, without a second sign-in', async () => {
		respondWith(200, { access_token: 'azure-token' });

		await expect(service.acquire(credential, AZURE_RESOURCE)).resolves.toBe('azure-token');
		expect(sentBody(request).get('scope')).toContain(
			'https://management.azure.com/user_impersonation',
		);
	});

	it('never names two resources in one token request', async () => {
		await service.acquire(credential, GRAPH_RESOURCE);

		const scope = String(sentBody(request).get('scope'));
		expect(scope).not.toContain('management.azure.com');
	});

	it('stores the rotated refresh token, so the next call still works', async () => {
		respondWith(200, { access_token: 'graph-token', refresh_token: 'refresh-2' });

		await service.acquire(credential, GRAPH_RESOURCE);

		expect(credentialsService.update).toHaveBeenCalledWith(
			'cred-1',
			expect.anything(),
			{ kind: 'system', reason: 'integration' },
			expect.objectContaining({
				oauthTokenData: expect.objectContaining({ refresh_token: 'refresh-2' }),
			}),
		);
	});

	/**
	 * `decrypt` reads the entity it is handed, so a caller that still holds the
	 * pre-rotation copy would write the spent refresh token back over the live
	 * one and sign the user out on the next call.
	 */
	it('puts the rotated token on the entity the caller holds', async () => {
		const held = mock<CredentialsEntity>({
			id: 'cred-1',
			name: 'Microsoft organization',
			type: 'microsoftTeamsManagerOAuth2Api',
			data: 'stale',
		});
		credentialsService.createEncryptedData.mockResolvedValue({ data: 'rotated' } as never);
		respondWith(200, { access_token: 'graph-token', refresh_token: 'refresh-2' });

		await service.acquire(held, GRAPH_RESOURCE);

		expect(held.data).toBe('rotated');
	});

	/**
	 * Queueing only orders the calls. Each one brought its own entity, read
	 * before the call ahead of it rotated the token, so the stored row -- not the
	 * entity -- is what says which refresh token is still live.
	 */
	it('redeems the stored token, not the spent one a caller still holds', async () => {
		const stored = mock<CredentialsEntity>({
			id: 'cred-1',
			name: 'Microsoft organization',
			type: 'microsoftTeamsManagerOAuth2Api',
			data: 'rotated',
		});
		credentialsRepository.findOneBy.mockResolvedValue(stored);
		credentialsService.decrypt.mockImplementation(
			async (entity: CredentialsEntity) =>
				({
					oauthTokenData: {
						refresh_token: entity.data === 'rotated' ? 'refresh-2' : 'refresh-1',
					},
				}) as never,
		);
		respondWith(200, { access_token: 'graph-token' });

		const stale = mock<CredentialsEntity>({
			id: 'cred-1',
			name: 'Microsoft organization',
			type: 'microsoftTeamsManagerOAuth2Api',
			data: 'spent',
		});
		await service.acquire(stale, GRAPH_RESOURCE);

		expect(sentBody(request).get('refresh_token')).toBe('refresh-2');
	});

	/**
	 * Entra retires the refresh token each redemption uses. Two that overlap both
	 * send the same one, and the slower one then stores a token Microsoft has
	 * already retired -- which signs the user out on the next call.
	 */
	it('redeems one at a time for a credential, whatever the resource', async () => {
		let active = 0;
		let overlapped = false;
		let n = 0;
		request.mockImplementation(async () => {
			active += 1;
			overlapped ||= active > 1;
			// Long enough for the other call to reach here if nothing held it back.
			await new Promise((resolve) => setImmediate(resolve));
			active -= 1;
			return { statusCode: 200, body: { access_token: `token-${++n}`, refresh_token: `r-${n}` } };
		});
		credentialsService.createEncryptedData.mockResolvedValue({ data: 'encrypted' } as never);

		await Promise.all([
			service.acquire(credential, GRAPH_RESOURCE),
			service.acquire(credential, AZURE_RESOURCE),
		]);

		expect(request).toHaveBeenCalledTimes(2);
		expect(overlapped).toBe(false);
	});

	it('keeps the stored token data when Microsoft returns no new refresh token', async () => {
		await service.acquire(credential, GRAPH_RESOURCE);

		expect(credentialsService.update).not.toHaveBeenCalled();
	});

	it('records a widened scope alongside the rotated token', async () => {
		respondWith(200, {
			access_token: 'graph-token',
			refresh_token: 'refresh-2',
			scope: 'openid User.Read',
		});

		await service.acquire(credential, GRAPH_RESOURCE);

		expect(credentialsService.update).toHaveBeenCalledWith(
			'cred-1',
			expect.anything(),
			{ kind: 'system', reason: 'integration' },
			expect.objectContaining({
				oauthTokenData: expect.objectContaining({ scope: 'openid User.Read' }),
			}),
		);
	});

	/**
	 * A refresh redeemed for one resource answers with that resource's scopes
	 * alone. Stored as they arrive, they shrink the record of what the sign-in
	 * granted, and the setup then asks for a sign-in it already has.
	 */
	it('keeps the scopes a single-resource refresh left out', async () => {
		credentialsService.decrypt.mockResolvedValue({
			oauthTokenData: {
				refresh_token: 'refresh-1',
				scope: 'openid https://management.azure.com/user_impersonation',
			},
		} as never);
		respondWith(200, {
			access_token: 'graph-token',
			refresh_token: 'refresh-2',
			scope: 'openid https://graph.microsoft.com/Application.ReadWrite.All',
		});

		await service.acquire(credential, GRAPH_RESOURCE);

		const [, , , stored] = credentialsService.update.mock.calls[0];
		const scope = String(
			(stored as { oauthTokenData: { scope: string } }).oauthTokenData.scope,
		).split(' ');
		expect(scope).toContain('https://management.azure.com/user_impersonation');
		expect(scope).toContain('https://graph.microsoft.com/Application.ReadWrite.All');
		expect(scope.filter((entry) => entry === 'openid')).toHaveLength(1);
	});

	it('asks the user to sign in again when there is no refresh token', async () => {
		credentialsService.decrypt.mockResolvedValue({} as never);

		await expect(service.acquire(credential, GRAPH_RESOURCE)).rejects.toThrow(BadRequestError);
		expect(request).not.toHaveBeenCalled();
	});

	it('refuses a credential of the wrong type', async () => {
		const wrongType = mock<CredentialsEntity>({ id: 'cred-2', type: 'slackManagerOAuth2Api' });

		await expect(service.acquire(wrongType, GRAPH_RESOURCE)).rejects.toThrow(BadRequestError);
	});

	it('refuses when the instance has no manager client credentials', async () => {
		credentialsOverwrites.getOverwrites.mockReturnValue(undefined as never);

		await expect(service.acquire(credential, GRAPH_RESOURCE)).rejects.toThrow(BadRequestError);
		expect(request).not.toHaveBeenCalled();
	});

	/**
	 * What Entra answers once the stored consent no longer matches the app
	 * registration — changing its permissions does exactly that. Retrying cannot
	 * fix it, so the message must not suggest it.
	 */
	it('says a stale sign-in has to be redone, not retried', async () => {
		respondWith(400, { error: 'invalid_grant' });

		await expect(service.acquire(credential, GRAPH_RESOURCE)).rejects.toThrow(/Sign in again/);
	});

	/**
	 * A grant is refused one resource at a time, and a sign-in that reaches Graph
	 * but not Azure is the common case. Calling that sign-in invalid sends the
	 * user to redo something that plainly works.
	 */
	it('names the resource it was refused for, not the sign-in as a whole', async () => {
		respondWith(400, { error: 'invalid_grant' });

		await expect(service.acquire(credential, AZURE_RESOURCE)).rejects.toThrow(/Azure/);
	});

	it('reports any other refusal without leaking the response', async () => {
		respondWith(400, { error: 'temporarily_unavailable', error_description: 'tenant contoso' });

		await expect(service.acquire(credential, GRAPH_RESOURCE)).rejects.toThrow(
			/would not issue a token/,
		);
		await expect(service.acquire(credential, GRAPH_RESOURCE)).rejects.not.toThrow(/contoso/);
	});
});

/**
 * Three lists name the Graph permissions, in two packages: the credential asks
 * for them at sign-in, the refresh asks again, and the setup checks the grant
 * carries the ones it cannot work without. Asking for less shrinks the
 * recorded grant and the setup sends the user round the sign-in again; asking
 * for more is refused outright. A required scope the credential never asks
 * for is worse still -- the reconnect it demands can never clear.
 */
describe('the Graph scopes on the refresh and on the credential', () => {
	const graphOnly = (scopes: string) =>
		scopes
			.split(' ')
			.filter((scope) => scope.startsWith(GRAPH_RESOURCE))
			.sort();

	it('name the same permissions', () => {
		const signInScopes = graphOnly(
			String(
				new MicrosoftTeamsManagerOAuth2Api().properties.find(({ name }) => name === 'scope')
					?.default ?? '',
			),
		);

		expect(signInScopes.length).toBeGreaterThan(0);
		expect(graphOnly(RESOURCE_SCOPES[GRAPH_RESOURCE])).toEqual(signInScopes);
	});

	it('require nothing the sign-in does not ask for', () => {
		const signInScopes = graphOnly(
			String(
				new MicrosoftTeamsManagerOAuth2Api().properties.find(({ name }) => name === 'scope')
					?.default ?? '',
			),
		);

		expect(REQUIRED_MANAGER_SCOPES.length).toBeGreaterThan(0);
		expect(signInScopes).toEqual(expect.arrayContaining([...REQUIRED_MANAGER_SCOPES]));
	});
});
