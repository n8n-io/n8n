import { mockInstance } from '@n8n/backend-test-utils';
import type { NextFunction } from 'express';
import { mock } from 'jest-mock-extended';

import { License } from '@/license';
import { PublicApiKeyService } from '@/services/public-api-key.service';

import * as middlewares from '../shared/middlewares/global.middleware';

jest.spyOn(middlewares, 'globalScope').mockReturnValue(jest.fn());

const license = mockInstance(License);
const publicApiKeyService = mockInstance(PublicApiKeyService);

afterEach(() => {
	jest.clearAllMocks();
});

describe('apiKeyHasScope', () => {
	it('should return API key scope middleware if "feat:apiKeyScopes" is enabled', () => {
		license.isApiKeyScopesEnabled.mockReturnValue(true);
		publicApiKeyService.getApiKeyScopeMiddleware.mockReturnValue(jest.fn());

		middlewares.apiKeyHasScope('credential:create');

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(publicApiKeyService.getApiKeyScopeMiddleware).toHaveBeenCalledWith('credential:create');
	});

	it('should return empty middleware if "feat:apiKeyScopes" is disabled', async () => {
		license.isApiKeyScopesEnabled.mockReturnValue(false);
		publicApiKeyService.getApiKeyScopeMiddleware.mockReturnValue(jest.fn());

		const responseMiddleware = middlewares.apiKeyHasScope('credential:create');

		expect(middlewares.globalScope).not.toHaveBeenCalled();

		const next: NextFunction = jest.fn();

		await responseMiddleware(mock(), mock(), next);

		expect(next).toHaveBeenCalled();
	});
});

describe('apiKeyHasScopeWithGlobalScopeFallback', () => {
	it('should return global middleware if "feat:apiKeyScopes" is disabled', () => {
		license.isApiKeyScopesEnabled.mockReturnValue(false);
		publicApiKeyService.getApiKeyScopeMiddleware.mockReturnValue(jest.fn());

		middlewares.apiKeyHasScopeWithGlobalScopeFallback({ scope: 'credential:create' });

		expect(middlewares.globalScope).toHaveBeenCalledWith('credential:create');
	});
});
