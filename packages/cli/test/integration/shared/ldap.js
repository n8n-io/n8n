'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.createLdapConfig = exports.defaultLdapConfig = void 0;
const constants_1 = require('@n8n/constants');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const n8n_workflow_1 = require('n8n-workflow');
exports.defaultLdapConfig = {
	...constants_1.LDAP_DEFAULT_CONFIGURATION,
	loginEnabled: true,
	loginLabel: '',
	ldapIdAttribute: 'uid',
	firstNameAttribute: 'givenName',
	lastNameAttribute: 'sn',
	emailAttribute: 'mail',
	loginIdAttribute: 'mail',
	baseDn: 'baseDn',
	bindingAdminDn: 'adminDn',
	bindingAdminPassword: 'adminPassword',
};
const createLdapConfig = async (attributes = {}) => {
	const { value: ldapConfig } = await di_1.Container.get(db_1.SettingsRepository).save({
		key: constants_1.LDAP_FEATURE_NAME,
		value: JSON.stringify({
			...exports.defaultLdapConfig,
			...attributes,
		}),
		loadOnStartup: true,
	});
	return await (0, n8n_workflow_1.jsonParse)(ldapConfig);
};
exports.createLdapConfig = createLdapConfig;
//# sourceMappingURL=ldap.js.map
