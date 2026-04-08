import { mockInstance } from '@n8n/backend-test-utils';

import { PublicApiKeyService } from '@/services/public-api-key.service';

import * as middlewares from '../shared/middlewares/global.middleware';

const publicApiKeyService = mockInstance(PublicApiKeyService);

afterEach(() => {
	jest.clearAllMocks();
});

describe('apiKeyHasScope', () => {
	it('should return API key scope middleware', () => {
		publicApiKeyService.getApiKeyScopeMiddleware.mockReturnValue(jest.fn());

		middlewares.apiKeyHasScope('credential:create');

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(publicApiKeyService.getApiKeyScopeMiddleware).toHaveBeenCalledWith('credential:create');
	});
});

describe('apiKeyHasScopeWithGlobalScopeFallback', () => {
	it('should return API key scope middleware', () => {
		publicApiKeyService.getApiKeyScopeMiddleware.mockReturnValue(jest.fn());

		middlewares.apiKeyHasScopeWithGlobalScopeFallback({ scope: 'credential:create' });

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(publicApiKeyService.getApiKeyScopeMiddleware).toHaveBeenCalledWith('credential:create');
	});
});
