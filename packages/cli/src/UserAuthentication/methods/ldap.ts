import { InternalHooksManager } from '@/InternalHooksManager';
import { SignInType } from '@/Ldap/constants';
import {
	createLdapUserOnLocalDb,
	findAndAuthenticateLdapUser,
	getLdapConfig,
	getLdapUserRole,
	getUserByEmail,
	getUserByLdapId,
	isInstanceOwner,
	isLdapDisabled,
	mapLdapAttributesToDb,
	transformEmailUserToLdapUser,
	updateLdapUserOnLocalDb,
} from '@/Ldap/helpers';
import type { User } from '@db/entities/User';

export const handleLdapLogin = async (
	email: string,
	password: string,
): Promise<User | undefined> => {
	if (isLdapDisabled()) return undefined;

	if (await isInstanceOwner(email)) return undefined;

	const ldapConfig = await getLdapConfig();

	if (!ldapConfig.loginEnabled) return undefined;

	const { loginIdAttribute, userFilter } = ldapConfig;

	const ldapUser = await findAndAuthenticateLdapUser(email, password, loginIdAttribute, userFilter);

	if (!ldapUser) return undefined;

	const ldapAttributesValues = mapLdapAttributesToDb(ldapUser, ldapConfig);

	const { ldapId: ldapIdAttributeValue, email: emailAttributeValue } = ldapAttributesValues;

	if (!ldapIdAttributeValue || !emailAttributeValue) return undefined;

	const localLdapUser = await getUserByLdapId(ldapIdAttributeValue);

	if (localLdapUser?.disabled) return undefined;

	if (localLdapUser) {
		await updateLdapUserOnLocalDb(ldapIdAttributeValue, ldapAttributesValues);
	} else {
		const emailUser = await getUserByEmail(emailAttributeValue);

		//check if there is an email user with the same email as the authenticated LDAP user trying to log-in
		if (emailUser && emailUser.email === emailAttributeValue) {
			await transformEmailUserToLdapUser(emailUser.email, ldapAttributesValues);
		} else {
			const role = await getLdapUserRole();
			const { id } = await createLdapUserOnLocalDb(role, ldapAttributesValues);

			void InternalHooksManager.getInstance().onUserSignup({
				user_id: id,
				user_type: SignInType.LDAP,
				was_disabled_ldap_user: false,
			});
		}
	}

	// Retrieve the user again as user's data might have been updated
	const updatedUser = await getUserByLdapId(ldapIdAttributeValue);

	return updatedUser;
};
