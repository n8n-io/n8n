/* eslint-disable import/no-cycle */
import { Db } from '../..';
import { SignInType } from '../../ActiveDirectory/constants';
import type { User } from '../../databases/entities/User';
import { compareHash } from '../../UserManagement/UserManagementHelper';

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
		return undefined;
	}

	return user;
};
