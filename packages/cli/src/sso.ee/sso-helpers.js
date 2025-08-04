'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.setCurrentAuthenticationMethod = setCurrentAuthenticationMethod;
exports.getCurrentAuthenticationMethod = getCurrentAuthenticationMethod;
exports.isSamlCurrentAuthenticationMethod = isSamlCurrentAuthenticationMethod;
exports.isLdapCurrentAuthenticationMethod = isLdapCurrentAuthenticationMethod;
exports.isOidcCurrentAuthenticationMethod = isOidcCurrentAuthenticationMethod;
exports.isEmailCurrentAuthenticationMethod = isEmailCurrentAuthenticationMethod;
exports.isSsoJustInTimeProvisioningEnabled = isSsoJustInTimeProvisioningEnabled;
exports.doRedirectUsersFromLoginToSsoFlow = doRedirectUsersFromLoginToSsoFlow;
const config_1 = require('@n8n/config');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const config_2 = __importDefault(require('@/config'));
async function setCurrentAuthenticationMethod(authenticationMethod) {
	config_2.default.set('userManagement.authenticationMethod', authenticationMethod);
	await di_1.Container.get(db_1.SettingsRepository).save(
		{
			key: 'userManagement.authenticationMethod',
			value: authenticationMethod,
			loadOnStartup: true,
		},
		{ transaction: false },
	);
}
function getCurrentAuthenticationMethod() {
	return config_2.default.getEnv('userManagement.authenticationMethod');
}
function isSamlCurrentAuthenticationMethod() {
	return getCurrentAuthenticationMethod() === 'saml';
}
function isLdapCurrentAuthenticationMethod() {
	return getCurrentAuthenticationMethod() === 'ldap';
}
function isOidcCurrentAuthenticationMethod() {
	return getCurrentAuthenticationMethod() === 'oidc';
}
function isEmailCurrentAuthenticationMethod() {
	return getCurrentAuthenticationMethod() === 'email';
}
function isSsoJustInTimeProvisioningEnabled() {
	return di_1.Container.get(config_1.GlobalConfig).sso.justInTimeProvisioning;
}
function doRedirectUsersFromLoginToSsoFlow() {
	return di_1.Container.get(config_1.GlobalConfig).sso.redirectLoginToSso;
}
//# sourceMappingURL=sso-helpers.js.map
