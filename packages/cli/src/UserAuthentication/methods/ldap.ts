/* eslint-disable import/no-cycle */
import { Db } from '../..';
import { SignInType } from '../../ActiveDirectory/constants';
import {
	findUserOnActiveDirectory,
	getActiveDirectoryConfig,
	getAdUserRole,
	getUserByUsername,
	isActiveDirectoryDisabled,
	mapAttributesToLocalDb,
	randonPassword,
} from '../../ActiveDirectory/helpers';
import type { User } from '../../databases/entities/User';

export const handleLdapLogin = async (
	email: string,
	password: string,
): Promise<User | undefined> => {
	if (isActiveDirectoryDisabled()) return undefined;

	const adConfig = await getActiveDirectoryConfig();

	if (!adConfig.data.login.enabled) return undefined;

	const {
		data: { attributeMapping },
	} = adConfig;

	const adUser = await findUserOnActiveDirectory(email, password, attributeMapping.loginId);

	if (!adUser) return undefined;

	const usernameAttributeValue = adUser[attributeMapping.username] as string | undefined;

	if (!usernameAttributeValue) return undefined;

	const localUser = await getUserByUsername(usernameAttributeValue);

	if (localUser?.disabled) return undefined;

	if (!localUser) {
		const role = await getAdUserRole();

		await Db.collections.User.save({
			password: randonPassword(),
			signInType: SignInType.LDAP,
			globalRole: role,
			...mapAttributesToLocalDb(adUser, attributeMapping),
		});
	} else {
		// @ts-ignore
		delete localUser.isPending;
		// move this to it's own function
		await Db.collections.User.update(localUser.id, {
			...localUser,
			...mapAttributesToLocalDb(adUser, attributeMapping),
		});
	}

	// Retrieve the user again as user's data might have been updated
	const updatedUser = await getUserByUsername(usernameAttributeValue);

	return updatedUser;
};
