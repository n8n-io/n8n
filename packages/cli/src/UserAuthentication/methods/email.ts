import * as Db from '@/Db';
import { SignInType } from '@/Ldap/constants';
import type { User } from '@db/entities/User';
import { compareHash } from '@/UserManagement/UserManagementHelper';

export const handleEmailLogin = async (
	email: string,
	password: string,
): Promise<User | undefined> => {
	const user = await Db.collections.User.findOne(
		{
			email,
			signInType: SignInType.EMAIL,
		},
		{
			relations: ['globalRole'],
		},
	);

	if (user?.password && (await compareHash(password, user.password))) {
		return user;
	}

	// At this point if the user has a LDAP ID, means it was previosly an LDAP user,
	// so suggest to reset the password to gain access to the instance.
	if (user?.ldapId) {
		const error = new Error('Reset your password to gain access to the instance.');
		// @ts-ignore
		error.httpStatusCode = 401;
		throw error;
	}

	return undefined;
};
