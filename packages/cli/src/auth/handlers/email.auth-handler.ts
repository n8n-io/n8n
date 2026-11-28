import { EventService, PasswordUtility } from '@n8n/backend-services';
import { GlobalConfig } from '@n8n/config';
import { Person, PersonRepository } from '@n8n/db';
import type { IPasswordAuthHandler } from '@n8n/decorators';
import { AuthHandler } from '@n8n/decorators';
import { Constructable } from '@n8n/di';

import { AuthError } from '@n8n/errors';

@AuthHandler()
export class EmailAuthHandler implements IPasswordAuthHandler<Person> {
	readonly metadata = { name: 'email', type: 'password' as const };
	readonly userClass: Constructable<Person> = Person;

	constructor(
		private readonly personRepository: PersonRepository,
		private readonly passwordUtility: PasswordUtility,
		private readonly eventService: EventService,
		private readonly globalConfig: GlobalConfig,
	) {}

	async handleLogin(email: string, password: string): Promise<Person | undefined> {
		const person = await this.personRepository.findByEmailWithAuthIdentities(email);

		// Always run the comparison, so the cost does not depend on whether the person exists.
		const isMatch = await this.passwordUtility.compare(password, person?.password || null);
		if (person?.password && isMatch) {
			return person;
		}

		// At this point if the user has a LDAP ID, means it was previously an LDAP user,
		// so suggest to reset the password to gain access to the instance.
		const ldapIdentity = person?.authIdentities?.find((i) => i.providerType === 'ldap');
		if (person && ldapIdentity && !this.globalConfig.sso.ldap.loginEnabled) {
			this.eventService.emit('login-failed-due-to-ldap-disabled', { userId: person.id });

			throw new AuthError('Reset your password to gain access to the instance.');
		}

		return undefined;
	}
}
