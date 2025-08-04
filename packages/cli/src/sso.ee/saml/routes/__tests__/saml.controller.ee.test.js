'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const service_provider_ee_1 = require('../../service-provider.ee');
const saml_controller_ee_1 = require('../saml.controller.ee');
const samlService = (0, jest_mock_extended_1.mock)();
const controller = new saml_controller_ee_1.SamlController(
	(0, jest_mock_extended_1.mock)(),
	samlService,
	(0, jest_mock_extended_1.mock)(),
	(0, jest_mock_extended_1.mock)(),
);
const user = (0, jest_mock_extended_1.mock)({
	id: '123',
	password: 'password',
	authIdentities: [],
	role: 'global:owner',
});
const attributes = {
	email: 'test@example.com',
	firstName: 'Test',
	lastName: 'User',
	userPrincipalName: 'upn:test@example.com',
};
describe('Test views', () => {
	const RelayState = (0, service_provider_ee_1.getServiceProviderConfigTestReturnUrl)();
	test('Should render success with template', async () => {
		const req = (0, jest_mock_extended_1.mock)();
		const res = (0, jest_mock_extended_1.mock)();
		samlService.handleSamlLogin.mockResolvedValueOnce({
			authenticatedUser: user,
			attributes,
			onboardingRequired: false,
		});
		await controller.acsPost(req, res, { RelayState });
		expect(res.render).toBeCalledWith('saml-connection-test-success', attributes);
	});
	test('Should render failure with template', async () => {
		const req = (0, jest_mock_extended_1.mock)();
		const res = (0, jest_mock_extended_1.mock)();
		samlService.handleSamlLogin.mockResolvedValueOnce({
			authenticatedUser: undefined,
			attributes,
			onboardingRequired: false,
		});
		await controller.acsPost(req, res, { RelayState });
		expect(res.render).toBeCalledWith('saml-connection-test-failed', { message: '', attributes });
	});
	test('Should render error with template', async () => {
		const req = (0, jest_mock_extended_1.mock)();
		const res = (0, jest_mock_extended_1.mock)();
		samlService.handleSamlLogin.mockRejectedValueOnce(new Error('Test Error'));
		await controller.acsPost(req, res, { RelayState });
		expect(res.render).toBeCalledWith('saml-connection-test-failed', { message: 'Test Error' });
	});
});
//# sourceMappingURL=saml.controller.ee.test.js.map
