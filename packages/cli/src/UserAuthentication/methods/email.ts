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

	return undefined;
};
