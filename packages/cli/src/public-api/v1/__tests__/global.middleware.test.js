'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const jest_mock_extended_1 = require('jest-mock-extended');
const license_1 = require('@/license');
const public_api_key_service_1 = require('@/services/public-api-key.service');
const middlewares = __importStar(require('../shared/middlewares/global.middleware'));
jest.spyOn(middlewares, 'globalScope').mockReturnValue(jest.fn());
const license = (0, backend_test_utils_1.mockInstance)(license_1.License);
const publicApiKeyService = (0, backend_test_utils_1.mockInstance)(
	public_api_key_service_1.PublicApiKeyService,
);
afterEach(() => {
	jest.clearAllMocks();
});
describe('apiKeyHasScope', () => {
	it('should return API key scope middleware if "feat:apiKeyScopes" is enabled', () => {
		license.isApiKeyScopesEnabled.mockReturnValue(true);
		publicApiKeyService.getApiKeyScopeMiddleware.mockReturnValue(jest.fn());
		middlewares.apiKeyHasScope('credential:create');
		expect(publicApiKeyService.getApiKeyScopeMiddleware).toHaveBeenCalledWith('credential:create');
	});
	it('should return empty middleware if "feat:apiKeyScopes" is disabled', async () => {
		license.isApiKeyScopesEnabled.mockReturnValue(false);
		publicApiKeyService.getApiKeyScopeMiddleware.mockReturnValue(jest.fn());
		const responseMiddleware = middlewares.apiKeyHasScope('credential:create');
		expect(middlewares.globalScope).not.toHaveBeenCalled();
		const next = jest.fn();
		await responseMiddleware(
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			next,
		);
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
//# sourceMappingURL=global.middleware.test.js.map
