import type { User } from '@n8n/db';
import { Container } from '@n8n/di';

import { EventService } from '@/events/event.service';
import {
	createLdapUserOnLocalDb,
	getUserByEmail,
	getAuthIdentityByLdapId,
	isLdapEnabled,
	mapLdapAttributesToUser,
	createLdapAuthIdentity,
	updateLdapUserOnLocalDb,
} from '@/ldap.ee/helpers.ee';
import { LdapService } from '@/ldap.ee/ldap.service.ee';

export const handleLdapLogin = async (
	loginId: string,
	password: string,
): Promise<User | undefined> => {
	if (!isLdapEnabled()) return undefined;

	const ldapService = Container.get(LdapService);

	if (!ldapService.config.loginEnabled) return undefined;

	const { loginIdAttribute, userFilter } = ldapService.config;

	const ldapUser = await ldapService.findAndAuthenticateLdapUser(
		loginId,
		password,
		loginIdAttribute,
		userFilter,
	);

	if (!ldapUser) return undefined;

	const [ldapId, ldapAttributesValues] = mapLdapAttributesToUser(ldapUser, ldapService.config);

	const { email: emailAttributeValue } = ldapAttributesValues;

	if (!ldapId || !emailAttributeValue) return undefined;

	const ldapAuthIdentity = await getAuthIdentityByLdapId(ldapId);
	if (!ldapAuthIdentity) {
		const emailUser = await getUserByEmail(emailAttributeValue);

		// check if there is an email user with the same email as the authenticated LDAP user trying to log-in
		if (emailUser && emailUser.email === emailAttributeValue) {
			const identity = await createLdapAuthIdentity(emailUser, ldapId);
			await updateLdapUserOnLocalDb(identity, ldapAttributesValues);
		} else {
			const user = await createLdapUserOnLocalDb(ldapAttributesValues, ldapId);
			Container.get(EventService).emit('user-signed-up', {
				user,
				userType: 'ldap',
				wasDisabledLdapUser: false,
			});
			return user;
		}
	} else {
		if (ldapAuthIdentity.user) {
			if (ldapAuthIdentity.user.disabled) return undefined;
			await updateLdapUserOnLocalDb(ldapAuthIdentity, ldapAttributesValues);
		}
	}

	// Retrieve the user again as user's data might have been updated
	return (await getAuthIdentityByLdapId(ldapId))?.user;
};
