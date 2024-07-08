import type { User } from '@db/entities/User';
import { PasswordUtility } from '@/services/password.utility';
import { Container } from 'typedi';
import { InternalHooks } from '@/InternalHooks';
import { isLdapLoginEnabled } from '@/Ldap/helpers.ee';
import { UserRepository } from '@db/repositories/user.repository';
import { AuthError } from '@/errors/response-errors/auth.error';

export const handleEmailLogin = async (
	email: string,
	password: string,
): Promise<User | undefined> => {
	const user = await Container.get(UserRepository).findOne({
		where: { email },
		relations: ['authIdentities'],
	});

	if (user?.password && (await Container.get(PasswordUtility).compare(password, user.password))) {
		return user;
	}

	// At this point if the user has a LDAP ID, means it was previously an LDAP user,
	// so suggest to reset the password to gain access to the instance.
	const ldapIdentity = user?.authIdentities?.find((i) => i.providerType === 'ldap');
	if (user && ldapIdentity && !isLdapLoginEnabled()) {
		void Container.get(InternalHooks).userLoginFailedDueToLdapDisabled({
			user_id: user.id,
		});

		throw new AuthError('Reset your password to gain access to the instance.');
	}

	return undefined;
};
