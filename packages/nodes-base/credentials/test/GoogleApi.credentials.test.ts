import { OutboundHttp } from '@n8n/backend-network';
import { Container } from '@n8n/di';
import jwt from 'jsonwebtoken';
import type { IHttpRequestOptions } from 'n8n-workflow';
import type { Mock } from 'vitest';

import { GoogleApi } from '../GoogleApi.credentials';

vi.mock('jsonwebtoken', () => ({
	default: { sign: vi.fn() },
}));

describe('GoogleApi Credential', () => {
	const credential = new GoogleApi();
	const mockedSign = jwt.sign as unknown as Mock;

	const requestMock = vi.fn();
	const requestsMock = vi.fn(() => ({ request: requestMock }));

	const baseCredentials = {
		httpNode: true,
		email: 'svc@project.iam.gserviceaccount.com',
		privateKey: '-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----',
		scopes: 'https://www.googleapis.com/auth/drive',
	};

	const requestOptions: IHttpRequestOptions = {
		headers: {},
		method: 'GET',
		url: 'https://www.googleapis.com/drive/v3/files',
	};

	beforeEach(() => {
		requestMock.mockReset();
		requestMock.mockResolvedValue({ access_token: 'abc123' });
		requestsMock.mockClear();
		mockedSign.mockReset();
		mockedSign.mockReturnValue('signed-jwt');

		vi.spyOn(Container, 'get').mockImplementation((token: unknown) => {
			if (token === OutboundHttp) return { requests: requestsMock };
			throw new Error('unexpected DI token');
		});
	});

	it('should have correct properties', () => {
		expect(credential.name).toBe('googleApi');
		expect(credential.displayName).toBe('Google Service Account API');
	});

	describe('region property', () => {
		const regionProperty = credential.properties.find((p) => p.name === 'region');
		const regionOptions = (regionProperty?.options ?? []) as Array<{ name: string; value: string }>;

		it('offers the global and multi-region locations first', () => {
			// Newer Gemini models (e.g. Gemini 3.x) are only served from these locations
			expect(regionOptions.slice(0, 3)).toEqual([
				{ name: 'Global (multi-region) - global', value: 'global' },
				{ name: 'EU (multi-region) - eu', value: 'eu' },
				{ name: 'US (multi-region) - us', value: 'us' },
			]);
		});

		it('keeps the regional options alongside the multi-region ones', () => {
			const values = regionOptions.map((o) => o.value);
			expect(values).toContain('us-central1');
			expect(values).toContain('europe-west4');
		});

		it('defaults to global, the only location serving both Gemini 2.x and 3.x', () => {
			expect(regionProperty?.default).toBe('global');
		});
	});

	describe('authenticate', () => {
		it('returns the request unchanged when not set up for the HTTP Request node', async () => {
			const result = await credential.authenticate(
				{ ...baseCredentials, httpNode: false },
				requestOptions,
			);

			expect(result).toBe(requestOptions);
			expect(requestMock).not.toHaveBeenCalled();
		});

		it('posts the JWT assertion as a form-urlencoded token request', async () => {
			await credential.authenticate(baseCredentials, requestOptions);

			expect(requestsMock).toHaveBeenCalledWith({ ssrf: 'disabled' });
			expect(requestMock).toHaveBeenCalledWith(
				expect.objectContaining({
					url: 'https://oauth2.googleapis.com/token',
					method: 'POST',
					body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=signed-jwt',
					headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
					json: true,
				}),
			);
		});

		it('attaches the returned access token to the outgoing request', async () => {
			const result = await credential.authenticate(baseCredentials, requestOptions);

			expect(result.headers?.Authorization).toBe('Bearer abc123');
		});
	});
});
