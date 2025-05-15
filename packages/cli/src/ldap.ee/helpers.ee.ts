import type { LdapConfig, ConnectionSecurity } from '@n8n/constants';
import type { AuthProviderSyncHistory, User } from '@n8n/db';
import {
	AuthIdentity,
	AuthIdentityRepository,
	AuthProviderSyncHistoryRepository,
	UserRepository,
	AuthUserRepository,
	AuthUser,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { validate } from 'jsonschema';
import type { Entry as LdapUser } from 'ldapts';
import { Filter } from 'ldapts/filters/Filter';
import { randomString } from 'n8n-workflow';

import config from '@/config';
import { License } from '@/license';

import {
	BINARY_AD_ATTRIBUTES,
	LDAP_CONFIG_SCHEMA,
	LDAP_LOGIN_ENABLED,
	LDAP_LOGIN_LABEL,
} from './constants';

/**
 *  Check whether the LDAP feature is disabled in the instance
 */
export const isLdapEnabled = () => {
	return Container.get(License).isLdapEnabled();
};

/**
 * Retrieve the LDAP login label from the configuration object
 */
export const getLdapLoginLabel = (): string => config.getEnv(LDAP_LOGIN_LABEL);

/**
 * Retrieve the LDAP login enabled from the configuration object
 */
export const isLdapLoginEnabled = (): boolean => config.getEnv(LDAP_LOGIN_ENABLED);

/**
 * Validate the structure of the LDAP configuration schema
 */
export const validateLdapConfigurationSchema = (
	ldapConfig: LdapConfig,
): { valid: boolean; message: string } => {
	const { valid, errors } = validate(ldapConfig, LDAP_CONFIG_SCHEMA, { nestedErrors: true });

	let message = '';
	if (!valid) {
		message = errors.map((error) => `request.body.${error.path[0]} ${error.message}`).join(',');
	}
	return { valid, message };
};

export const resolveEntryBinaryAttributes = (entry: LdapUser): LdapUser => {
	Object.entries(entry)
		.filter(([k]) => BINARY_AD_ATTRIBUTES.includes(k))
		.forEach(([k]) => {
			entry[k] = (entry[k] as Buffer).toString('hex');
		});
	return entry;
};

export const resolveBinaryAttributes = (entries: LdapUser[]): void => {
	entries.forEach((entry) => resolveEntryBinaryAttributes(entry));
};

export const createFilter = (filter: string, userFilter: string) => {
	let _filter = `(&(|(objectClass=person)(objectClass=user))${filter})`;
	if (userFilter) {
		_filter = `(&${userFilter}${filter}`;
	}
	return _filter;
};

export const escapeFilter = (filter: string): string => {
	//@ts-ignore
	return new Filter().escape(filter); /* eslint-disable-line */
};

/**
 * Retrieve auth identity by LDAP ID from database
 */
export const getAuthIdentityByLdapId = async (
	idAttributeValue: string,
): Promise<AuthIdentity | null> => {
	return await Container.get(AuthIdentityRepository).findOne({
		relations: { user: true },
		where: {
			providerId: idAttributeValue,
			providerType: 'ldap',
		},
	});
};

export const getUserByEmail = async (email: string): Promise<AuthUser | null> => {
	return await Container.get(AuthUserRepository).findOne({
		where: { email },
	});
};

/**
 * Map attributes from the LDAP server to the proper columns in the database
 * e.g. mail => email | uid => ldapId
 */
export const mapLdapAttributesToUser = (
	ldapUser: LdapUser,
	ldapConfig: LdapConfig,
): [AuthIdentity['providerId'], Pick<User, 'email' | 'firstName' | 'lastName'>] => {
	return [
		ldapUser[ldapConfig.ldapIdAttribute] as string,
		{
			email: ldapUser[ldapConfig.emailAttribute] as string,
			firstName: ldapUser[ldapConfig.firstNameAttribute] as string,
			lastName: ldapUser[ldapConfig.lastNameAttribute] as string,
		},
	];
};

/**
 * Retrieve LDAP ID of all LDAP users in the database
 */
export const getLdapIds = async (): Promise<string[]> => {
	const identities = await Container.get(AuthIdentityRepository).find({
		select: ['providerId'],
		where: {
			providerType: 'ldap',
		},
	});
	return identities.map((i) => i.providerId);
};

export const getLdapUsers = async (): Promise<User[]> => {
	const identities = await Container.get(AuthIdentityRepository).find({
		relations: { user: true },
		where: {
			providerType: 'ldap',
		},
	});
	return identities.map((i) => i.user);
};

/**
 * Map a LDAP user to database user
 */
export const mapLdapUserToDbUser = (
	ldapUser: LdapUser,
	ldapConfig: LdapConfig,
	toCreate = false,
): [string, AuthUser] => {
	const user = new AuthUser();
	const [ldapId, data] = mapLdapAttributesToUser(ldapUser, ldapConfig);
	Object.assign(user, data);
	if (toCreate) {
		user.role = 'global:member';
		user.password = randomString(8);
		user.disabled = false;
	} else {
		user.disabled = true;
	}
	return [ldapId, user];
};

/**
 * Save "toCreateUsers" in the database
 * Update "toUpdateUsers" in the database
 * Update "ToDisableUsers" in the database
 */
export const processUsers = async (
	toCreateUsers: Array<[string, AuthUser]>,
	toUpdateUsers: Array<[string, AuthUser]>,
	toDisableUsers: string[],
): Promise<void> => {
	const authUserRepository = Container.get(AuthUserRepository);
	const { manager: dbManager } = authUserRepository;
	await dbManager.transaction(async (transactionManager) => {
		return await Promise.all([
			...toCreateUsers.map(async ([ldapId, user]) => {
				const { user: savedUser } = await authUserRepository.createUserWithProject(
					user,
					transactionManager,
				);
				const authIdentity = AuthIdentity.create(savedUser, ldapId);
				return await transactionManager.save(authIdentity);
			}),
			...toUpdateUsers.map(async ([ldapId, user]) => {
				const authIdentity = await transactionManager.findOneBy(AuthIdentity, {
					providerId: ldapId,
				});
				if (authIdentity?.userId) {
					await transactionManager.update(
						AuthUser,
						{ id: authIdentity.userId },
						{ email: user.email, firstName: user.firstName, lastName: user.lastName },
					);
				}
			}),
			...toDisableUsers.map(async (ldapId) => {
				const authIdentity = await transactionManager.findOneBy(AuthIdentity, {
					providerId: ldapId,
				});
				if (authIdentity?.userId) {
					const user = await transactionManager.findOneBy(AuthUser, { id: authIdentity.userId });

					if (user) {
						user.disabled = true;
						await transactionManager.save(user);
					}

					await transactionManager.delete(AuthIdentity, { userId: authIdentity?.userId });
				}
			}),
		]);
	});
};

/**
 * Save a LDAP synchronization data to the database
 */
export const saveLdapSynchronization = async (
	data: Omit<AuthProviderSyncHistory, 'id' | 'providerType'>,
): Promise<void> => {
	await Container.get(AuthProviderSyncHistoryRepository).save(
		{
			...data,
			providerType: 'ldap',
		},
		{ transaction: false },
	);
};

/**
 * Retrieve all LDAP synchronizations in the database
 */
export const getLdapSynchronizations = async (
	page: number,
	perPage: number,
): Promise<AuthProviderSyncHistory[]> => {
	const _page = Math.abs(page);
	return await Container.get(AuthProviderSyncHistoryRepository).find({
		where: { providerType: 'ldap' },
		order: { id: 'DESC' },
		take: perPage,
		skip: _page * perPage,
	});
};

/**
 * Format the LDAP connection URL to conform with LDAP client library
 */
export const formatUrl = (url: string, port: number, security: ConnectionSecurity) => {
	const protocol = ['tls'].includes(security) ? 'ldaps' : 'ldap';
	return `${protocol}://${url}:${port}`;
};

export const getMappingAttributes = (ldapConfig: LdapConfig): string[] => {
	return [
		ldapConfig.emailAttribute,
		ldapConfig.ldapIdAttribute,
		ldapConfig.firstNameAttribute,
		ldapConfig.lastNameAttribute,
		ldapConfig.emailAttribute,
	];
};

export const createLdapAuthIdentity = async (user: User, ldapId: string) => {
	return await Container.get(AuthIdentityRepository).save(AuthIdentity.create(user, ldapId), {
		transaction: false,
	});
};

export const createLdapUserOnLocalDb = async (data: Partial<User>, ldapId: string) => {
	const { user } = await Container.get(AuthUserRepository).createUserWithProject({
		password: randomString(8),
		role: 'global:member',
		...data,
	});
	await createLdapAuthIdentity(user, ldapId);
	return user;
};

export const updateLdapUserOnLocalDb = async (identity: AuthIdentity, data: Partial<User>) => {
	const userId = identity?.user?.id;
	if (userId) {
		const user = await Container.get(UserRepository).findOneBy({ id: userId });

		if (user) {
			await Container.get(UserRepository).save({ id: userId, ...data }, { transaction: true });
		}
	}
};

export const deleteAllLdapIdentities = async () => {
	return await Container.get(AuthIdentityRepository).delete({ providerType: 'ldap' });
};
