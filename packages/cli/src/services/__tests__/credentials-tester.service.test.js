'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const Mock_1 = __importDefault(require('jest-mock-extended/lib/Mock'));
const credentials_tester_service_1 = require('@/services/credentials-tester.service');
describe('CredentialsTester', () => {
	const credentialTypes = (0, Mock_1.default)();
	const nodeTypes = (0, Mock_1.default)();
	const credentialsTester = new credentials_tester_service_1.CredentialsTester(
		(0, Mock_1.default)(),
		(0, Mock_1.default)(),
		credentialTypes,
		nodeTypes,
		(0, Mock_1.default)(),
	);
	beforeEach(() => {
		jest.clearAllMocks();
	});
	it('should find the OAuth2 credential test for a generic OAuth2 API credential', () => {
		credentialTypes.getByName.mockReturnValue((0, Mock_1.default)({ test: undefined }));
		credentialTypes.getSupportedNodes.mockReturnValue(['oAuth2Api']);
		credentialTypes.getParentTypes.mockReturnValue([]);
		nodeTypes.getByName.mockReturnValue(
			(0, Mock_1.default)({
				description: { credentials: [{ name: 'oAuth2Api' }] },
			}),
		);
		const testFn = credentialsTester.getCredentialTestFunction('oAuth2Api');
		if (typeof testFn !== 'function') fail();
		expect(testFn.name).toBe('oauth2CredTest');
	});
});
//# sourceMappingURL=credentials-tester.service.test.js.map
