import type { User } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { AuthError } from '@/errors/response-errors/auth.error';
import { EventService } from '@/events/event.service';
import { isLdapLoginEnabled } from '@/ldap.ee/helpers.ee';
import { PasswordUtility } from '@/services/password.utility';

export const handleEmailLogin = async (
	email: string,
	password: string,
): Promise<User | undefined> => {
	const user = await Container.get(UserRepository).findOne({
		where: { email },
		relations: ['authIdentities', 'role'],
	});

	if (user?.password && (await Container.get(PasswordUtility).compare(password, user.password))) {
		return user;
	}

	// At this point if the user has a LDAP ID, means it was previously an LDAP user,
	// so suggest to reset the password to gain access to the instance.
	const ldapIdentity = user?.authIdentities?.find((i) => i.providerType === 'ldap');
	if (user && ldapIdentity && !isLdapLoginEnabled()) {
		Container.get(EventService).emit('login-failed-due-to-ldap-disabled', { userId: user.id });

		throw new AuthError('Reset your password to gain access to the instance.');
	}

	return undefined;
};
