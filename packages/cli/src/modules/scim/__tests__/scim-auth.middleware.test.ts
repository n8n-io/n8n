import type { Logger } from '@n8n/backend-common';
import type { AuthenticatedRequest } from '@n8n/db';
import type { Mocked } from 'vitest';
import type { NextFunction, Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { ScimAuthMiddleware } from '../scim-auth.middleware';
import type { ScimSettingsService } from '../scim-settings.service';
import type { ScimTokenService } from '../scim-token.service';

describe('ScimAuthMiddleware', () => {
	let scimTokenService: Mocked<ScimTokenService>;
	let scimSettingsService: Mocked<ScimSettingsService>;
	let middleware: ScimAuthMiddleware;
	let res: Mocked<Response>;
	let next: NextFunction;

	const requestWithAuth = (authorization?: string) =>
		mock<AuthenticatedRequest>({ headers: { authorization } });

	beforeEach(() => {
		scimTokenService = mock<ScimTokenService>();
		scimSettingsService = mock<ScimSettingsService>();
		scimSettingsService.isEnabled.mockResolvedValue(true);
		middleware = new ScimAuthMiddleware(mock<Logger>(), scimTokenService, scimSettingsService);
		res = mock<Response>();
		res.status.mockReturnValue(res);
		res.header.mockReturnValue(res);
		next = vi.fn();
	});

	it('should reject all requests when provisioning is disabled', async () => {
		scimSettingsService.isEnabled.mockResolvedValue(false);
		scimTokenService.verifyApiKey.mockResolvedValue(true);

		await middleware.authenticate(requestWithAuth('Bearer valid-token'), res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(scimTokenService.verifyApiKey).not.toHaveBeenCalled();
		expect(next).not.toHaveBeenCalled();
	});

	it('should reject requests without an Authorization header', async () => {
		await middleware.authenticate(requestWithAuth(undefined), res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.header).toHaveBeenCalledWith('WWW-Authenticate', 'Bearer realm="n8n SCIM"');
		expect(next).not.toHaveBeenCalled();
	});

	it('should reject non-bearer Authorization headers', async () => {
		await middleware.authenticate(requestWithAuth('Basic dXNlcjpwYXNz'), res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(next).not.toHaveBeenCalled();
	});

	it('should reject invalid tokens', async () => {
		scimTokenService.verifyApiKey.mockResolvedValue(false);

		await middleware.authenticate(requestWithAuth('Bearer invalid-token'), res, next);

		expect(scimTokenService.verifyApiKey).toHaveBeenCalledWith('invalid-token');
		expect(res.status).toHaveBeenCalledWith(401);
		expect(next).not.toHaveBeenCalled();
	});

	it('should call next() for valid tokens', async () => {
		scimTokenService.verifyApiKey.mockResolvedValue(true);

		await middleware.authenticate(requestWithAuth('Bearer valid-token'), res, next);

		expect(next).toHaveBeenCalled();
		expect(res.status).not.toHaveBeenCalled();
	});

	it('should respond with 500 when verification throws', async () => {
		scimTokenService.verifyApiKey.mockRejectedValue(new Error('db down'));

		await middleware.authenticate(requestWithAuth('Bearer token'), res, next);

		expect(res.status).toHaveBeenCalledWith(500);
		expect(next).not.toHaveBeenCalled();
	});

	// RFC 7235 section 2.1: the auth scheme is case-insensitive, and providers
	// do not all send the canonical casing.
	it.each(['Bearer', 'bearer', 'BEARER', 'BeArEr'])('accepts the %s scheme', async (scheme) => {
		scimTokenService.verifyApiKey.mockResolvedValue(true);

		await middleware.authenticate(requestWithAuth(`${scheme} a-token`), res, next);

		expect(scimTokenService.verifyApiKey).toHaveBeenCalledWith('a-token');
		expect(next).toHaveBeenCalled();
	});

	it('tolerates extra whitespace around the token', async () => {
		scimTokenService.verifyApiKey.mockResolvedValue(true);

		await middleware.authenticate(requestWithAuth('Bearer   a-token  '), res, next);

		expect(scimTokenService.verifyApiKey).toHaveBeenCalledWith('a-token');
	});

	it('rejects a scheme that merely starts with the word', async () => {
		await middleware.authenticate(requestWithAuth('Bearerish a-token'), res, next);

		expect(scimTokenService.verifyApiKey).not.toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(401);
	});
});
