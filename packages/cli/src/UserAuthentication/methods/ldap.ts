import * as Db from '@/Db';
import { SignInType } from '@/Ldap/constants';
import {
	findAndAuthenticateLdapUser,
	getLdapConfig,
	getLdapUserRole,
	getUserByLdapId,
	isLdapDisabled,
	mapLdapAttributesToDb,
	randomPassword,
} from '@/Ldap/helpers';
import type { User } from '@db/entities/User';

export const handleLdapLogin = async (
	email: string,
	password: string,
): Promise<User | undefined> => {
	if (isLdapDisabled()) return undefined;

	const adConfig = await getLdapConfig();

	if (!adConfig.data.login.enabled) return undefined;

	const {
		data: { attributeMapping, filter },
	} = adConfig;

	const adUser = await findAndAuthenticateLdapUser(
		email,
		password,
		attributeMapping.loginId,
		filter.user,
	);

	if (!adUser) return undefined;

	const usernameAttributeValue = adUser[attributeMapping.ldapId] as string | undefined;

	if (!usernameAttributeValue) return undefined;

	const localUser = await getUserByLdapId(usernameAttributeValue);

	if (localUser?.disabled) return undefined;

	if (!localUser) {
		const role = await getLdapUserRole();

		await Db.collections.User.save({
			password: randomPassword(),
			signInType: SignInType.LDAP,
			globalRole: role,
			...mapLdapAttributesToDb(adUser, attributeMapping),
		});
	} else {
		// @ts-ignore
		delete localUser.isPending;
		// move this to it's own function
		await Db.collections.User.update(localUser.id, {
			...localUser,
			...mapLdapAttributesToDb(adUser, attributeMapping),
		});
	}

	// Retrieve the user again as user's data might have been updated
	const updatedUser = await getUserByLdapId(usernameAttributeValue);

	return updatedUser;
};
