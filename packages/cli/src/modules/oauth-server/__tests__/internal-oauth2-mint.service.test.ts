import type { Logger } from '@n8n/backend-common';
import {
	markHttpRequestError,
	type HttpRequestClient,
	type OutboundHttp,
} from '@n8n/backend-network';
import { AxiosError } from 'axios';
import { OperationalError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { EventService } from '@/events/event.service';
import type { ServiceAccountCredentialService } from '@/services/service-account-credential.service';
import type { UrlService } from '@/services/url.service';

import { InternalOAuth2MintService } from '../internal-oauth2-mint.service';

const ORIGIN = 'http://localhost:5678';
const TARGET_URL = `${ORIGIN}/mcp/proof`;
// The RFC 9728 §3.1 path-suffix well-known URL derived from TARGET_URL.
const PRM_WELL_KNOWN = `${ORIGIN}/.well-known/oauth-protected-resource/mcp/proof`;
// The issuer advertised by the protected-resource metadata (this instance).
const ISSUER = ORIGIN;
const AS_WELL_KNOWN = `${ISSUER}/.well-known/oauth-authorization-server`;
// The token endpoint the AS metadata advertises — deliberately NOT `/oauth/token`.
const DISCOVERED_TOKEN_ENDPOINT = `${ISSUER}/mcp-oauth/token`;
// A canonical resource distinct from the raw target, so we can prove the mint
// sends what the PRM advertised rather than the caller-supplied target URL.
const CANONICAL_RESOURCE = `${ORIGIN}/canonical-mcp-resource`;
const FALLBACK_TOKEN_ENDPOINT = `${ORIGIN}/oauth/token`;

const USER_ID = 'sa-user-id';
const CLIENT_ID = 'client-id';
const CLIENT_SECRET = 'client-secret';

type RequestOptions = { url: string; method: string; body?: string };

const http401 = () => {
	// The real client tags the errors it rejects; mirror that so the status guard fires.
	const requestError = markHttpRequestError(new AxiosError('Unauthorized'));
	requestError.response = mock<AxiosError['response']>({ status: 401 });
	return requestError;
};

const http404 = () => {
	const requestError = markHttpRequestError(new AxiosError('Not Found'));
	requestError.response = mock<AxiosError['response']>({ status: 404 });
	return requestError;
};

describe('InternalOAuth2MintService', () => {
	const serviceAccountCredentialService = mock<ServiceAccountCredentialService>();
	const urlService = mock<UrlService>();
	const eventService = mock<EventService>();
	const logger = mock<Logger>();
	const request = vi.fn();
	const requests = vi.fn().mockReturnValue(mock<HttpRequestClient>({ request }));
	const outboundHttp = mock<OutboundHttp>({ requests });

	let service: InternalOAuth2MintService;

	beforeEach(() => {
		vi.clearAllMocks();
		urlService.getInstanceBaseUrl.mockReturnValue(ORIGIN);
		serviceAccountCredentialService.getDecryptedForUser.mockResolvedValue({
			clientId: CLIENT_ID,
			clientSecret: CLIENT_SECRET,
		});
		service = new InternalOAuth2MintService(
			serviceAccountCredentialService,
			urlService,
			eventService,
			logger,
			outboundHttp,
		);
	});

	const findCall = (url: string) =>
		request.mock.calls.map(([options]) => options as RequestOptions).find((o) => o.url === url);

	describe('protocol-driven discovery', () => {
		beforeEach(() => {
			// Route by URL: PRM well-known → RFC 9728 doc, AS well-known → RFC 8414 doc,
			// discovered token endpoint → a minted token.
			request.mockImplementation(({ url }: RequestOptions) => {
				if (url === PRM_WELL_KNOWN) {
					return { resource: CANONICAL_RESOURCE, authorization_servers: [ISSUER] };
				}
				if (url === AS_WELL_KNOWN) {
					return { token_endpoint: DISCOVERED_TOKEN_ENDPOINT };
				}
				if (url === DISCOVERED_TOKEN_ENDPOINT) {
					return { access_token: 'minted-token' };
				}
				throw new Error(`unexpected request url: ${url}`);
			});
		});

		it('discovers the token endpoint + canonical resource and mints against them', async () => {
			const token = await service.mintForUser(USER_ID, TARGET_URL);

			expect(token).toBe('minted-token');

			// (a) it fetched the PRM well-known URL derived from the target URL.
			expect(findCall(PRM_WELL_KNOWN)?.method).toBe('GET');
			// (b) it fetched the issuer's AS metadata.
			expect(findCall(AS_WELL_KNOWN)?.method).toBe('GET');

			// (c) the mint POST went to the discovered endpoint, not `/oauth/token`.
			const mintCall = findCall(DISCOVERED_TOKEN_ENDPOINT);
			expect(mintCall?.method).toBe('POST');
			expect(findCall(FALLBACK_TOKEN_ENDPOINT)).toBeUndefined();

			// (d) the `resource` sent equals the canonical resource from the PRM doc.
			const params = new URLSearchParams(mintCall?.body);
			expect(params.get('grant_type')).toBe('client_credentials');
			expect(params.get('client_id')).toBe(CLIENT_ID);
			expect(params.get('client_secret')).toBe(CLIENT_SECRET);
			expect(params.get('resource')).toBe(CANONICAL_RESOURCE);

			// (e) the success audit `aud` equals the canonical resource.
			expect(eventService.emit).toHaveBeenCalledWith('service-account-token-minted', {
				sub: USER_ID,
				clientId: CLIENT_ID,
				aud: CANONICAL_RESOURCE,
				outcome: 'success',
			});
		});

		it('preserves the target query string in the well-known PRM URL', async () => {
			request.mockImplementation(({ url }: RequestOptions) => {
				if (url === `${PRM_WELL_KNOWN}?method=POST`) {
					return { resource: CANONICAL_RESOURCE, authorization_servers: [ISSUER] };
				}
				if (url === AS_WELL_KNOWN) return { token_endpoint: DISCOVERED_TOKEN_ENDPOINT };
				if (url === DISCOVERED_TOKEN_ENDPOINT) return { access_token: 'minted-token' };
				throw new Error(`unexpected request url: ${url}`);
			});

			await service.mintForUser(USER_ID, `${TARGET_URL}?method=POST`);

			expect(findCall(`${PRM_WELL_KNOWN}?method=POST`)?.method).toBe('GET');
		});

		it('throws and emits failure when the discovered mint endpoint returns a non-2xx', async () => {
			request.mockImplementation(({ url }: RequestOptions) => {
				if (url === PRM_WELL_KNOWN) {
					return { resource: CANONICAL_RESOURCE, authorization_servers: [ISSUER] };
				}
				if (url === AS_WELL_KNOWN) return { token_endpoint: DISCOVERED_TOKEN_ENDPOINT };
				throw http401();
			});

			await expect(service.mintForUser(USER_ID, TARGET_URL)).rejects.toThrow(OperationalError);

			expect(eventService.emit).toHaveBeenCalledWith('service-account-token-minted', {
				sub: USER_ID,
				clientId: CLIENT_ID,
				aud: CANONICAL_RESOURCE,
				outcome: 'failure',
			});
		});
	});

	describe('fallback when the target is not an n8n-served protected resource', () => {
		it('warns and mints against the instance token endpoint with the raw target URL', async () => {
			// PRM discovery 404s → fall back to `{instanceBaseUrl}/oauth/token`.
			request.mockImplementation(({ url }: RequestOptions) => {
				if (url === PRM_WELL_KNOWN) throw http404();
				if (url === FALLBACK_TOKEN_ENDPOINT) return { access_token: 'fallback-token' };
				throw new Error(`unexpected request url: ${url}`);
			});

			const token = await service.mintForUser(USER_ID, TARGET_URL);

			expect(token).toBe('fallback-token');
			expect(logger.warn).toHaveBeenCalledWith(
				'OAuth2 discovery failed; falling back to instance token endpoint',
				{ targetUrl: TARGET_URL },
			);

			const mintCall = findCall(FALLBACK_TOKEN_ENDPOINT);
			expect(mintCall?.method).toBe('POST');
			const params = new URLSearchParams(mintCall?.body);
			expect(params.get('resource')).toBe(TARGET_URL);

			expect(eventService.emit).toHaveBeenCalledWith('service-account-token-minted', {
				sub: USER_ID,
				clientId: CLIENT_ID,
				aud: TARGET_URL,
				outcome: 'success',
			});
		});

		it('falls back when the PRM doc is malformed (no authorization server)', async () => {
			request.mockImplementation(({ url }: RequestOptions) => {
				if (url === PRM_WELL_KNOWN) return { resource: CANONICAL_RESOURCE };
				if (url === FALLBACK_TOKEN_ENDPOINT) return { access_token: 'fallback-token' };
				throw new Error(`unexpected request url: ${url}`);
			});

			const token = await service.mintForUser(USER_ID, TARGET_URL);

			expect(token).toBe('fallback-token');
			expect(findCall(FALLBACK_TOKEN_ENDPOINT)?.method).toBe('POST');
		});
	});

	it('throws OperationalError and emits a failure event when the user has no credential', async () => {
		serviceAccountCredentialService.getDecryptedForUser.mockResolvedValue(null);

		await expect(service.mintForUser(USER_ID, TARGET_URL)).rejects.toThrow(OperationalError);

		expect(request).not.toHaveBeenCalled();
		expect(eventService.emit).toHaveBeenCalledWith('service-account-token-minted', {
			sub: USER_ID,
			clientId: '',
			aud: TARGET_URL,
			outcome: 'failure',
		});
	});
});
