'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.isSamlPreferences = void 0;
exports.isSamlLoginEnabled = isSamlLoginEnabled;
exports.getSamlLoginLabel = getSamlLoginLabel;
exports.setSamlLoginEnabled = setSamlLoginEnabled;
exports.setSamlLoginLabel = setSamlLoginLabel;
exports.isSamlLicensed = isSamlLicensed;
exports.isSamlLicensedAndEnabled = isSamlLicensedAndEnabled;
exports.createUserFromSamlAttributes = createUserFromSamlAttributes;
exports.updateUserFromSamlAttributes = updateUserFromSamlAttributes;
exports.getMappedSamlAttributesFromFlowResult = getMappedSamlAttributesFromFlowResult;
exports.isConnectionTestRequest = isConnectionTestRequest;
const config_1 = require('@n8n/config');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const n8n_workflow_1 = require('n8n-workflow');
const auth_error_1 = require('@/errors/response-errors/auth.error');
const internal_server_error_1 = require('@/errors/response-errors/internal-server.error');
const license_1 = require('@/license');
const password_utility_1 = require('@/services/password.utility');
const service_provider_ee_1 = require('./service-provider.ee');
const sso_helpers_1 = require('../sso-helpers');
function isSamlLoginEnabled() {
	return di_1.Container.get(config_1.GlobalConfig).sso.saml.loginEnabled;
}
function getSamlLoginLabel() {
	return di_1.Container.get(config_1.GlobalConfig).sso.saml.loginLabel;
}
async function setSamlLoginEnabled(enabled) {
	const currentAuthenticationMethod = (0, sso_helpers_1.getCurrentAuthenticationMethod)();
	if (
		enabled &&
		!(0, sso_helpers_1.isEmailCurrentAuthenticationMethod)() &&
		!(0, sso_helpers_1.isSamlCurrentAuthenticationMethod)()
	) {
		throw new internal_server_error_1.InternalServerError(
			`Cannot switch SAML login enabled state when an authentication method other than email or saml is active (current: ${currentAuthenticationMethod})`,
		);
	}
	const targetAuthenticationMethod =
		!enabled && currentAuthenticationMethod === 'saml' ? 'email' : currentAuthenticationMethod;
	di_1.Container.get(config_1.GlobalConfig).sso.saml.loginEnabled = enabled;
	await (0, sso_helpers_1.setCurrentAuthenticationMethod)(
		enabled ? 'saml' : targetAuthenticationMethod,
	);
}
function setSamlLoginLabel(label) {
	di_1.Container.get(config_1.GlobalConfig).sso.saml.loginLabel = label;
}
function isSamlLicensed() {
	return di_1.Container.get(license_1.License).isSamlEnabled();
}
function isSamlLicensedAndEnabled() {
	return (
		isSamlLoginEnabled() &&
		isSamlLicensed() &&
		(0, sso_helpers_1.isSamlCurrentAuthenticationMethod)()
	);
}
const isSamlPreferences = (candidate) => {
	const o = candidate;
	return (
		typeof o === 'object' &&
		typeof o.metadata === 'string' &&
		typeof o.mapping === 'object' &&
		o.mapping !== null &&
		o.loginEnabled !== undefined
	);
};
exports.isSamlPreferences = isSamlPreferences;
async function createUserFromSamlAttributes(attributes) {
	const randomPassword = (0, n8n_workflow_1.randomString)(18);
	const userRepository = di_1.Container.get(db_1.UserRepository);
	return await userRepository.manager.transaction(async (trx) => {
		const { user } = await userRepository.createUserWithProject(
			{
				email: attributes.email.toLowerCase(),
				firstName: attributes.firstName,
				lastName: attributes.lastName,
				role: 'global:member',
				password: await di_1.Container.get(password_utility_1.PasswordUtility).hash(randomPassword),
			},
			trx,
		);
		await trx.save(
			trx.create(db_1.AuthIdentity, {
				providerId: attributes.userPrincipalName,
				providerType: 'saml',
				userId: user.id,
			}),
		);
		return user;
	});
}
async function updateUserFromSamlAttributes(user, attributes) {
	if (!attributes.email) throw new auth_error_1.AuthError('Email is required to update user');
	if (!user) throw new auth_error_1.AuthError('User not found');
	let samlAuthIdentity = user?.authIdentities.find((e) => e.providerType === 'saml');
	if (!samlAuthIdentity) {
		samlAuthIdentity = new db_1.AuthIdentity();
		samlAuthIdentity.providerId = attributes.userPrincipalName;
		samlAuthIdentity.providerType = 'saml';
		samlAuthIdentity.user = user;
		user.authIdentities.push(samlAuthIdentity);
	} else {
		samlAuthIdentity.providerId = attributes.userPrincipalName;
	}
	await di_1.Container.get(db_1.AuthIdentityRepository).save(samlAuthIdentity, {
		transaction: false,
	});
	user.firstName = attributes.firstName;
	user.lastName = attributes.lastName;
	const resultUser = await di_1.Container.get(db_1.UserRepository).save(user, {
		transaction: false,
	});
	if (!resultUser) throw new auth_error_1.AuthError('Could not create User');
	return resultUser;
}
function getMappedSamlAttributesFromFlowResult(flowResult, attributeMapping) {
	const result = {
		attributes: undefined,
		missingAttributes: [],
	};
	if (flowResult?.extract?.attributes) {
		const attributes = flowResult.extract.attributes;
		const email = attributes[attributeMapping.email];
		const firstName = attributes[attributeMapping.firstName];
		const lastName = attributes[attributeMapping.lastName];
		const userPrincipalName = attributes[attributeMapping.userPrincipalName];
		result.attributes = {
			email,
			firstName,
			lastName,
			userPrincipalName,
		};
		if (!email) result.missingAttributes.push(attributeMapping.email);
		if (!userPrincipalName) result.missingAttributes.push(attributeMapping.userPrincipalName);
		if (!firstName) result.missingAttributes.push(attributeMapping.firstName);
		if (!lastName) result.missingAttributes.push(attributeMapping.lastName);
	}
	return result;
}
function isConnectionTestRequest(payload) {
	return payload.RelayState === (0, service_provider_ee_1.getServiceProviderConfigTestReturnUrl)();
}
//# sourceMappingURL=saml-helpers.js.map
