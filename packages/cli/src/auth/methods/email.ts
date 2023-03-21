import * as Db from '@/Db';
import type { User } from '@db/entities/User';
import { compareHash } from '@/UserManagement/UserManagementHelper';
import * as ResponseHelper from '@/ResponseHelper';
import { Container } from 'typedi';
import { InternalHooks } from '@/InternalHooks';

export const handleEmailLogin = async (
	email: string,
	password: string,
): Promise<User | undefined> => {
	const user = await Db.collections.User.findOne({
		where: { email },
		relations: ['globalRole', 'authIdentities'],
	});

	if (user?.password && (await compareHash(password, user.password))) {
		return user;
	}

	// At this point if the user has a LDAP ID, means it was previously an LDAP user,
	// so suggest to reset the password to gain access to the instance.
	const ldapIdentity = user?.authIdentities?.find((i) => i.providerType === 'ldap');
	if (user && ldapIdentity) {
		void Container.get(InternalHooks).userLoginFailedDueToLdapDisabled({
			user_id: user.id,
		});

		throw new ResponseHelper.AuthError('Reset your password to gain access to the instance.');
	}

	return undefined;
};
