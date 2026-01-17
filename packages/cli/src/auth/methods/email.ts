import type { User } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { AuthHandlerRegistry } from '@/auth/auth-handler.registry';
import { AuthError } from '@/errors/response-errors/auth.error';
import { EventService } from '@/events/event.service';
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

	// Check if the user has an auth identity from a provider that is currently disabled
	// If so, suggest resetting the password to gain access to the instance
	if (user) {
		const disabledProviders = Container.get(AuthHandlerRegistry).getDisabledProvidersForUser(user);
		if (disabledProviders.includes('ldap')) {
			Container.get(EventService).emit('login-failed-due-to-ldap-disabled', { userId: user.id });
		}
		if (disabledProviders.length > 0) {
			throw new AuthError('Reset your password to gain access to the instance.');
		}
	}

	return undefined;
};
