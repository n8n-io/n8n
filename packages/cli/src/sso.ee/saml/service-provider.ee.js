'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.getServiceProviderEntityId = getServiceProviderEntityId;
exports.getServiceProviderReturnUrl = getServiceProviderReturnUrl;
exports.getServiceProviderConfigTestReturnUrl = getServiceProviderConfigTestReturnUrl;
exports.getServiceProviderInstance = getServiceProviderInstance;
const di_1 = require('@n8n/di');
const url_service_1 = require('@/services/url.service');
let serviceProviderInstance;
function getServiceProviderEntityId() {
	return (
		di_1.Container.get(url_service_1.UrlService).getInstanceBaseUrl() + '/rest/sso/saml/metadata'
	);
}
function getServiceProviderReturnUrl() {
	return di_1.Container.get(url_service_1.UrlService).getInstanceBaseUrl() + '/rest/sso/saml/acs';
}
function getServiceProviderConfigTestReturnUrl() {
	return di_1.Container.get(url_service_1.UrlService).getInstanceBaseUrl() + '/config/test/return';
}
function getServiceProviderInstance(prefs, samlify) {
	if (serviceProviderInstance === undefined) {
		serviceProviderInstance = samlify.ServiceProvider({
			entityID: getServiceProviderEntityId(),
			authnRequestsSigned: prefs.authnRequestsSigned,
			wantAssertionsSigned: prefs.wantAssertionsSigned,
			wantMessageSigned: prefs.wantMessageSigned,
			signatureConfig: prefs.signatureConfig,
			relayState: prefs.relayState,
			nameIDFormat: ['urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'],
			assertionConsumerService: [
				{
					isDefault: prefs.acsBinding === 'post',
					Binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
					Location: getServiceProviderReturnUrl(),
				},
				{
					isDefault: prefs.acsBinding === 'redirect',
					Binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-REDIRECT',
					Location: getServiceProviderReturnUrl(),
				},
			],
		});
	}
	return serviceProviderInstance;
}
//# sourceMappingURL=service-provider.ee.js.map
