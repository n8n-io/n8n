import axios from 'axios';
import jwt from 'jsonwebtoken';
import type { IHttpRequestOptions } from 'n8n-workflow';

import { GoogleApi } from '../GoogleApi.credentials';

jest.mock('axios', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('jsonwebtoken', () => ({ __esModule: true, default: { sign: jest.fn() } }));

describe('GoogleApi Credential', () => {
	const credential = new GoogleApi();
	const mockedAxios = axios as unknown as jest.Mock;
	const mockedSign = jwt.sign as unknown as jest.Mock;

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
		mockedAxios.mockReset();
		mockedAxios.mockResolvedValue({ data: { access_token: 'abc123' } });
		mockedSign.mockReset();
		mockedSign.mockReturnValue('signed-jwt');
	});

	it('should have correct properties', () => {
		expect(credential.name).toBe('googleApi');
		expect(credential.displayName).toBe('Google Service Account API');
	});

	describe('authenticate', () => {
		it('returns the request unchanged when not set up for the HTTP Request node', async () => {
			const result = await credential.authenticate(
				{ ...baseCredentials, httpNode: false },
				requestOptions,
			);

			expect(result).toBe(requestOptions);
			expect(mockedAxios).not.toHaveBeenCalled();
		});

		it('posts the JWT assertion as a form-urlencoded token request', async () => {
			await credential.authenticate(baseCredentials, requestOptions);

			expect(mockedAxios).toHaveBeenCalledWith(
				expect.objectContaining({
					url: 'https://oauth2.googleapis.com/token',
					method: 'POST',
					data: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=signed-jwt',
					headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				}),
			);
		});

		it('attaches the returned access token to the outgoing request', async () => {
			const result = await credential.authenticate(baseCredentials, requestOptions);

			expect(result.headers?.Authorization).toBe('Bearer abc123');
		});

		it('signs the assertion with only standard JWT header fields', async () => {
			await credential.authenticate(baseCredentials, requestOptions);

			const signOptions = mockedSign.mock.calls[0][2] as { header: Record<string, unknown> };
			expect(signOptions.header).toEqual({ typ: 'JWT', alg: 'RS256' });
			expect(signOptions.header).not.toHaveProperty('kid');
		});
	});
});
