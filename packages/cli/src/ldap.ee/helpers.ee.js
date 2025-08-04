'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.deleteAllLdapIdentities =
	exports.updateLdapUserOnLocalDb =
	exports.createLdapUserOnLocalDb =
	exports.createLdapAuthIdentity =
	exports.getMappingAttributes =
	exports.formatUrl =
	exports.getLdapSynchronizations =
	exports.saveLdapSynchronization =
	exports.processUsers =
	exports.mapLdapUserToDbUser =
	exports.getLdapUsers =
	exports.getLdapIds =
	exports.mapLdapAttributesToUser =
	exports.getUserByEmail =
	exports.getAuthIdentityByLdapId =
	exports.escapeFilter =
	exports.createFilter =
	exports.resolveBinaryAttributes =
	exports.resolveEntryBinaryAttributes =
	exports.validateLdapConfigurationSchema =
	exports.isLdapLoginEnabled =
	exports.getLdapLoginLabel =
	exports.isLdapEnabled =
		void 0;
const config_1 = require('@n8n/config');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const jsonschema_1 = require('jsonschema');
const Filter_1 = require('ldapts/filters/Filter');
const n8n_workflow_1 = require('n8n-workflow');
const license_1 = require('@/license');
const constants_1 = require('./constants');
const isLdapEnabled = () => {
	return di_1.Container.get(license_1.License).isLdapEnabled();
};
exports.isLdapEnabled = isLdapEnabled;
const getLdapLoginLabel = () => di_1.Container.get(config_1.GlobalConfig).sso.ldap.loginLabel;
exports.getLdapLoginLabel = getLdapLoginLabel;
const isLdapLoginEnabled = () => di_1.Container.get(config_1.GlobalConfig).sso.ldap.loginEnabled;
exports.isLdapLoginEnabled = isLdapLoginEnabled;
const validateLdapConfigurationSchema = (ldapConfig) => {
	const { valid, errors } = (0, jsonschema_1.validate)(ldapConfig, constants_1.LDAP_CONFIG_SCHEMA, {
		nestedErrors: true,
	});
	let message = '';
	if (!valid) {
		message = errors.map((error) => `request.body.${error.path[0]} ${error.message}`).join(',');
	}
	return { valid, message };
};
exports.validateLdapConfigurationSchema = validateLdapConfigurationSchema;
const resolveEntryBinaryAttributes = (entry) => {
	Object.entries(entry)
		.filter(([k]) => constants_1.BINARY_AD_ATTRIBUTES.includes(k))
		.forEach(([k]) => {
			entry[k] = entry[k].toString('hex');
		});
	return entry;
};
exports.resolveEntryBinaryAttributes = resolveEntryBinaryAttributes;
const resolveBinaryAttributes = (entries) => {
	entries.forEach((entry) => (0, exports.resolveEntryBinaryAttributes)(entry));
};
exports.resolveBinaryAttributes = resolveBinaryAttributes;
const createFilter = (filter, userFilter) => {
	let _filter = `(&(|(objectClass=person)(objectClass=user))${filter})`;
	if (userFilter) {
		_filter = `(&${userFilter}${filter}`;
	}
	return _filter;
};
exports.createFilter = createFilter;
const escapeFilter = (filter) => {
	return new Filter_1.Filter().escape(filter);
};
exports.escapeFilter = escapeFilter;
const getAuthIdentityByLdapId = async (idAttributeValue) => {
	return await di_1.Container.get(db_1.AuthIdentityRepository).findOne({
		relations: { user: true },
		where: {
			providerId: idAttributeValue,
			providerType: 'ldap',
		},
	});
};
exports.getAuthIdentityByLdapId = getAuthIdentityByLdapId;
const getUserByEmail = async (email) => {
	return await di_1.Container.get(db_1.UserRepository).findOne({
		where: { email },
	});
};
exports.getUserByEmail = getUserByEmail;
const mapLdapAttributesToUser = (ldapUser, ldapConfig) => {
	return [
		ldapUser[ldapConfig.ldapIdAttribute],
		{
			email: ldapUser[ldapConfig.emailAttribute],
			firstName: ldapUser[ldapConfig.firstNameAttribute],
			lastName: ldapUser[ldapConfig.lastNameAttribute],
		},
	];
};
exports.mapLdapAttributesToUser = mapLdapAttributesToUser;
const getLdapIds = async () => {
	const identities = await di_1.Container.get(db_1.AuthIdentityRepository).find({
		select: ['providerId'],
		where: {
			providerType: 'ldap',
		},
	});
	return identities.map((i) => i.providerId);
};
exports.getLdapIds = getLdapIds;
const getLdapUsers = async () => {
	const identities = await di_1.Container.get(db_1.AuthIdentityRepository).find({
		relations: { user: true },
		where: {
			providerType: 'ldap',
		},
	});
	return identities.map((i) => i.user);
};
exports.getLdapUsers = getLdapUsers;
const mapLdapUserToDbUser = (ldapUser, ldapConfig, toCreate = false) => {
	const user = new db_1.User();
	const [ldapId, data] = (0, exports.mapLdapAttributesToUser)(ldapUser, ldapConfig);
	Object.assign(user, data);
	if (toCreate) {
		user.role = 'global:member';
		user.password = (0, n8n_workflow_1.randomString)(8);
		user.disabled = false;
	} else {
		user.disabled = true;
	}
	return [ldapId, user];
};
exports.mapLdapUserToDbUser = mapLdapUserToDbUser;
const processUsers = async (toCreateUsers, toUpdateUsers, toDisableUsers) => {
	const userRepository = di_1.Container.get(db_1.UserRepository);
	const { manager: dbManager } = userRepository;
	await dbManager.transaction(async (transactionManager) => {
		return await Promise.all([
			...toCreateUsers.map(async ([ldapId, user]) => {
				const { user: savedUser } = await userRepository.createUserWithProject(
					user,
					transactionManager,
				);
				const authIdentity = db_1.AuthIdentity.create(savedUser, ldapId);
				return await transactionManager.save(authIdentity);
			}),
			...toUpdateUsers.map(async ([ldapId, user]) => {
				const authIdentity = await transactionManager.findOneBy(db_1.AuthIdentity, {
					providerId: ldapId,
				});
				if (authIdentity?.userId) {
					await transactionManager.update(
						db_1.User,
						{ id: authIdentity.userId },
						{ email: user.email, firstName: user.firstName, lastName: user.lastName },
					);
				}
			}),
			...toDisableUsers.map(async (ldapId) => {
				const authIdentity = await transactionManager.findOneBy(db_1.AuthIdentity, {
					providerId: ldapId,
				});
				if (authIdentity?.userId) {
					const user = await transactionManager.findOneBy(db_1.User, { id: authIdentity.userId });
					if (user) {
						user.disabled = true;
						await transactionManager.save(user);
					}
					await transactionManager.delete(db_1.AuthIdentity, { userId: authIdentity?.userId });
				}
			}),
		]);
	});
};
exports.processUsers = processUsers;
const saveLdapSynchronization = async (data) => {
	await di_1.Container.get(db_1.AuthProviderSyncHistoryRepository).save(
		{
			...data,
			providerType: 'ldap',
		},
		{ transaction: false },
	);
};
exports.saveLdapSynchronization = saveLdapSynchronization;
const getLdapSynchronizations = async (page, perPage) => {
	const _page = Math.abs(page);
	return await di_1.Container.get(db_1.AuthProviderSyncHistoryRepository).find({
		where: { providerType: 'ldap' },
		order: { id: 'DESC' },
		take: perPage,
		skip: _page * perPage,
	});
};
exports.getLdapSynchronizations = getLdapSynchronizations;
const formatUrl = (url, port, security) => {
	const protocol = ['tls'].includes(security) ? 'ldaps' : 'ldap';
	return `${protocol}://${url}:${port}`;
};
exports.formatUrl = formatUrl;
const getMappingAttributes = (ldapConfig) => {
	return [
		ldapConfig.emailAttribute,
		ldapConfig.ldapIdAttribute,
		ldapConfig.firstNameAttribute,
		ldapConfig.lastNameAttribute,
		ldapConfig.emailAttribute,
	];
};
exports.getMappingAttributes = getMappingAttributes;
const createLdapAuthIdentity = async (user, ldapId) => {
	return await di_1.Container.get(db_1.AuthIdentityRepository).save(
		db_1.AuthIdentity.create(user, ldapId),
		{
			transaction: false,
		},
	);
};
exports.createLdapAuthIdentity = createLdapAuthIdentity;
const createLdapUserOnLocalDb = async (data, ldapId) => {
	const { user } = await di_1.Container.get(db_1.UserRepository).createUserWithProject({
		password: (0, n8n_workflow_1.randomString)(8),
		role: 'global:member',
		...data,
	});
	await (0, exports.createLdapAuthIdentity)(user, ldapId);
	return user;
};
exports.createLdapUserOnLocalDb = createLdapUserOnLocalDb;
const updateLdapUserOnLocalDb = async (identity, data) => {
	const userId = identity?.user?.id;
	if (userId) {
		const user = await di_1.Container.get(db_1.UserRepository).findOneBy({ id: userId });
		if (user) {
			await di_1.Container.get(db_1.UserRepository).save(
				{ id: userId, ...data },
				{ transaction: true },
			);
		}
	}
};
exports.updateLdapUserOnLocalDb = updateLdapUserOnLocalDb;
const deleteAllLdapIdentities = async () => {
	return await di_1.Container.get(db_1.AuthIdentityRepository).delete({ providerType: 'ldap' });
};
exports.deleteAllLdapIdentities = deleteAllLdapIdentities;
//# sourceMappingURL=helpers.ee.js.map
