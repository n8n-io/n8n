import type { Logger } from '@n8n/backend-common';
import type { EngineConfig } from '@n8n/config';
import { ACTION_TOKEN, mintActionToken, mintIdentityToken } from '@n8n/engine';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { createEngineControlPlaneAuthMiddleware } from '../engine-control-plane-auth.middleware';

const authSecret = 'a'.repeat(32);

describe('createEngineControlPlaneAuthMiddleware', () => {
	let logger: Logger;
	let next: NextFunction;

	const newResponse = () => {
		const res = { status: vi.fn(), json: vi.fn() };
		res.status.mockReturnValue(res);
		return res as unknown as Mocked<Response>;
	};

	const newRequest = (authorization?: string) =>
		({
			method: 'POST',
			originalUrl: '/internal/status-callback',
			header: vi.fn((name: string) =>
				name.toLowerCase() === 'authorization' ? authorization : undefined,
			),
		}) as unknown as Request;

	const authenticate = (authorization?: string, secret = authSecret) => {
		const res = newResponse();
		const middleware = createEngineControlPlaneAuthMiddleware(
			mock<EngineConfig>({ authSecret: secret }),
			logger,
		);
		middleware(newRequest(authorization), res, next);
		return res;
	};

	const expectRejected = (res: Mocked<Response>) => {
		expect(next).not.toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(401);
		expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('/internal/status-callback'));
	};

	beforeEach(() => {
		logger = mock<Logger>();
		next = vi.fn();
	});

	it('accepts a callback token scoped to status writes', () => {
		const res = authenticate(`Bearer ${mintActionToken(authSecret, 'lifecycle-events:write')}`);

		expect(next).toHaveBeenCalled();
		expect(res.status).not.toHaveBeenCalled();
	});

	it('reads the secret per request, so one generated after startup still works', () => {
		// The secret is set after construction.
		const engineConfig = mock<EngineConfig>({ authSecret: '' });
		const middleware = createEngineControlPlaneAuthMiddleware(engineConfig, logger);
		engineConfig.authSecret = authSecret;

		middleware(
			newRequest(`Bearer ${mintActionToken(authSecret, 'lifecycle-events:write')}`),
			newResponse(),
			next,
		);

		expect(next).toHaveBeenCalled();
	});

	it.each([
		['no authorization header', undefined],
		['a non-bearer scheme', 'Basic abc'],
		['a token that is not a JWT', 'Bearer not-a-jwt'],
	])('rejects %s', (_label, authorization) => {
		expectRejected(authenticate(authorization));
	});

	it('rejects an identity token minted for the control plane to data plane direction', () => {
		// Same secret; only the issuer and audience stop the replay.
		const token = mintIdentityToken(authSecret, { cpId: 'cp-1', tenantId: 'tenant-1' });

		expectRejected(authenticate(`Bearer ${token}`));
	});

	it('rejects a token carrying a different scope', () => {
		const token = jwt.sign({ scope: 'credential:read' }, authSecret, {
			algorithm: 'HS256',
			issuer: ACTION_TOKEN.issuer,
			audience: ACTION_TOKEN.audience,
			expiresIn: ACTION_TOKEN.ttlSeconds,
		});

		expectRejected(authenticate(`Bearer ${token}`));
	});

	it('rejects a token signed with a different secret', () => {
		const token = mintActionToken('b'.repeat(32), 'lifecycle-events:write');

		expectRejected(authenticate(`Bearer ${token}`));
	});

	it('rejects everything when no shared secret is configured', () => {
		const token = mintActionToken(authSecret, 'lifecycle-events:write');

		expectRejected(authenticate(`Bearer ${token}`, ''));
	});

	it('does not leak which check failed', () => {
		const res = authenticate('Bearer not-a-jwt');

		expect(res.json).toHaveBeenCalledWith({ code: 401, message: 'Unauthenticated' });
	});
});
