import type { AuthUser } from '@db/entities/AuthUser';
import { PasswordUtility } from '@/services/password.utility';
import { Container } from 'typedi';
import { InternalHooks } from '@/InternalHooks';
import { isLdapLoginEnabled } from '@/Ldap/helpers';
import { AuthUserRepository } from '@db/repositories/authUser.repository';
import { AuthError } from '@/errors/response-errors/auth.error';

export const handleEmailLogin = async (
	email: string,
	password: string,
): Promise<AuthUser | undefined> => {
	const user = await Container.get(AuthUserRepository).findForAuth({ email }, true);

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
