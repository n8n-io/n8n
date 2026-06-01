import type { AuthenticatedRequest, TokenGrant, User } from '@n8n/db';
import type { ApiKeyScope } from '@n8n/permissions';
import { mock, mockDeep } from 'jest-mock-extended';
import type { NextFunction, Response } from 'express';

import * as middlewares from '../shared/middlewares/global.middleware';

function buildReq(tokenGrant?: TokenGrant): AuthenticatedRequest {
	return { headers: {}, query: {}, params: {}, tokenGrant } as unknown as AuthenticatedRequest;
}

describe('publicApiScope', () => {
	let res: jest.Mocked<Response>;
	let next: jest.MockedFunction<NextFunction>;

	beforeEach(() => {
		res = mockDeep<Response>();
		res.status.mockReturnThis();
		res.json.mockReturnThis();
		next = jest.fn();
	});

	it('tags the returned middleware with the provided scope', () => {
		const mw = middlewares.publicApiScope('credential:create' as ApiKeyScope);
		expect(mw.__apiKeyScope).toBe('credential:create');
	});

	it('returns 403 when tokenGrant is absent', async () => {
		await middlewares.publicApiScope('workflow:read' as ApiKeyScope)(
			buildReq(undefined) as any,
			res,
			next,
		);
		expect(next).not.toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden' });
	});

	it('calls next() when the required scope is present in tokenGrant.apiKeyScopes', async () => {
		const grant: TokenGrant = {
			scopes: [],
			apiKeyScopes: ['workflow:read'],
			subject: mock<User>(),
		};
		await middlewares.publicApiScope('workflow:read' as ApiKeyScope)(
			buildReq(grant) as any,
			res,
			next,
		);
		expect(next).toHaveBeenCalled();
	});

	it('returns 403 when the required scope is not in tokenGrant.apiKeyScopes', async () => {
		const grant: TokenGrant = {
			scopes: ['workflow:create'],
			apiKeyScopes: ['workflow:read'],
			subject: mock<User>(),
		};
		await middlewares.publicApiScope('workflow:create' as ApiKeyScope)(
			buildReq(grant) as any,
			res,
			next,
		);
		expect(next).not.toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden' });
	});

	it('returns 403 when tokenGrant.apiKeyScopes is empty', async () => {
		const grant: TokenGrant = {
			scopes: ['workflow:read'],
			apiKeyScopes: [],
			subject: mock<User>(),
		};
		await middlewares.publicApiScope('workflow:read' as ApiKeyScope)(
			buildReq(grant) as any,
			res,
			next,
		);
		expect(next).not.toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden' });
	});

	it('returns 403 when apiKeyScopes is absent even if scopes contains the required scope', async () => {
		const grant: TokenGrant = { scopes: ['workflow:read'], subject: mock<User>() };
		await middlewares.publicApiScope('workflow:read' as ApiKeyScope)(
			buildReq(grant) as any,
			res,
			next,
		);
		expect(next).not.toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden' });
	});
});

describe('apiKeyHasScopeWithGlobalScopeFallback', () => {
	it('returns tagged middleware with the scope from { scope } config', () => {
		const mw = middlewares.apiKeyHasScopeWithGlobalScopeFallback({
			scope: 'credential:create' as any,
		});
		expect(mw.__apiKeyScope).toBe('credential:create');
	});

	it('returns tagged middleware with the apiKeyScope from { apiKeyScope, globalScope } config', () => {
		const mw = middlewares.apiKeyHasScopeWithGlobalScopeFallback({
			apiKeyScope: 'credential:create' as any,
			globalScope: 'credential:create' as any,
		});
		expect(mw.__apiKeyScope).toBe('credential:create');
	});
});
