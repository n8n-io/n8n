import { PersonRepository } from '@n8n/db';
import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { z } from 'zod';

import { BaseCommand } from '../base-command';

const flagsSchema = z.object({
	email: z.string().describe('The email of the user to disable the MFA authentication'),
});

@Command({
	name: 'mfa:disable',
	description: 'Disable MFA authentication for a user',
	examples: ['--email=johndoe@example.com'],
	flagsSchema,
})
export class DisableMFACommand extends BaseCommand<z.infer<typeof flagsSchema>> {
	async run(): Promise<void> {
		const { flags } = this;

		if (!flags.email) {
			this.logger.info('An email with --email must be provided');
			return;
		}

		const repository = Container.get(PersonRepository);
		const person = await repository.findByEmail(flags.email);

		if (!person) {
			this.reportUserDoesNotExistError(flags.email);
			return;
		}

		if (
			person.mfaSecret === null &&
			Array.isArray(person.mfaRecoveryCodes) &&
			person.mfaRecoveryCodes.length === 0 &&
			!person.mfaEnabled
		) {
			this.reportUserDoesNotExistError(flags.email);
			return;
		}

		Object.assign(person, { mfaSecret: null, mfaRecoveryCodes: [], mfaEnabled: false });

		await repository.save(person);

		this.reportSuccess(flags.email);
	}

	async catch(error: Error) {
		this.logger.error('An error occurred while disabling MFA in account');
		this.logger.error(error.message);
	}

	private reportSuccess(email: string) {
		this.logger.info(`Successfully disabled MFA for user with email: ${email}`);
	}

	private reportUserDoesNotExistError(email: string) {
		this.logger.info(`User with email: ${email} does not exist`);
	}
}
