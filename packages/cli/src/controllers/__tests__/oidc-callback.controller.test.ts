import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { CredentialsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Request, Response } from 'express';
import { mockDeep } from 'jest-mock-extended';

import { OidcCallbackController } from '../oidc-callback.controller';

describe('OidcCallbackController', () => {
	mockInstance(Logger);
	const credentialsRepository = mockInstance(CredentialsRepository);
	const controller = Container.get(OidcCallbackController);

	const createMockResponse = () => {
		const res = mockDeep<Response>();
		res.status.mockReturnThis();
		return res;
	};

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe('handleCallback', () => {
		it('should return 401 when IdP returns error', async () => {
			const req = mockDeep<Request>();
			req.query = {
				error: 'access_denied',
				error_description: 'User denied access',
			};
			const res = createMockResponse();

			await controller.handleCallback(req, res);

			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.send).toHaveBeenCalledWith(
				expect.stringContaining('Authentication failed'),
			);
		});

		it('should return 400 when code parameter is missing', async () => {
			const req = mockDeep<Request>();
			req.query = { state: 'some-state' };
			const res = createMockResponse();

			await controller.handleCallback(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.send).toHaveBeenCalledWith('Missing code or state parameter');
		});

		it('should return 400 when state parameter is missing', async () => {
			const req = mockDeep<Request>();
			req.query = { code: 'auth-code' };
			const res = createMockResponse();

			await controller.handleCallback(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.send).toHaveBeenCalledWith('Missing code or state parameter');
		});

		it('should return 401 when state cookie is missing', async () => {
			const req = mockDeep<Request>();
			req.query = { code: 'auth-code', state: 'some-state' };
			req.cookies = {};
			const res = createMockResponse();

			await controller.handleCallback(req, res);

			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.send).toHaveBeenCalledWith(
				expect.stringContaining('Missing state cookie'),
			);
		});

		it('should return 401 when CSRF token does not match', async () => {
			// Create valid state cookie with different CSRF
			const stateData = {
				csrf: 'csrf-token-1',
				codeVerifier: 'verifier',
				returnUrl: 'http://localhost/form/test',
				credentialId: 'cred-id',
				webhookPath: '/form/test',
				timestamp: Date.now(),
			};
			const stateCookie = Buffer.from(JSON.stringify(stateData)).toString('base64url');

			// Create state param with different CSRF
			const stateParam = Buffer.from(JSON.stringify({ csrf: 'csrf-token-2' })).toString(
				'base64url',
			);

			const req = mockDeep<Request>();
			req.query = { code: 'auth-code', state: stateParam };
			req.cookies = { n8n_oidc_state: stateCookie };
			const res = createMockResponse();

			await controller.handleCallback(req, res);

			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.send).toHaveBeenCalledWith(
				expect.stringContaining('State mismatch'),
			);
		});

		it('should return 401 when state has expired', async () => {
			// Create valid state cookie with expired timestamp (more than 10 minutes ago)
			const stateData = {
				csrf: 'csrf-token',
				codeVerifier: 'verifier',
				returnUrl: 'http://localhost/form/test',
				credentialId: 'cred-id',
				webhookPath: '/form/test',
				timestamp: Date.now() - 700000, // 11+ minutes ago
			};
			const stateCookie = Buffer.from(JSON.stringify(stateData)).toString('base64url');

			// Create matching state param
			const stateParam = Buffer.from(JSON.stringify({ csrf: 'csrf-token' })).toString(
				'base64url',
			);

			const req = mockDeep<Request>();
			req.query = { code: 'auth-code', state: stateParam };
			req.cookies = { n8n_oidc_state: stateCookie };
			const res = createMockResponse();

			await controller.handleCallback(req, res);

			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.send).toHaveBeenCalledWith('Authentication session expired');
		});

		it('should return 500 when credential cannot be found', async () => {
			// Create valid state cookie with current timestamp
			const stateData = {
				csrf: 'csrf-token',
				codeVerifier: 'verifier',
				returnUrl: 'http://localhost/form/test',
				credentialId: 'non-existent-cred',
				webhookPath: '/form/test',
				timestamp: Date.now(),
			};
			const stateCookie = Buffer.from(JSON.stringify(stateData)).toString('base64url');

			// Create matching state param
			const stateParam = Buffer.from(JSON.stringify({ csrf: 'csrf-token' })).toString(
				'base64url',
			);

			const req = mockDeep<Request>();
			req.query = { code: 'auth-code', state: stateParam };
			req.cookies = { n8n_oidc_state: stateCookie };
			const res = createMockResponse();

			// Mock credential not found
			credentialsRepository.findOneBy.mockResolvedValue(null);

			await controller.handleCallback(req, res);

			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.send).toHaveBeenCalledWith(
				expect.stringContaining('Failed to load authentication configuration'),
			);
		});
	});
});
