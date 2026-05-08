import { UserRepository, WebauthnCredentialRepository } from '@n8n/db';
import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { z } from 'zod';

import { MfaService } from '@/mfa/mfa.service';

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

		const userRepository = Container.get(UserRepository);
		const webauthnRepository = Container.get(WebauthnCredentialRepository);
		const mfaService = Container.get(MfaService);

		const user = await userRepository.findOneBy({ email: flags.email });

		if (!user) {
			this.reportUserDoesNotExistError(flags.email);
			return;
		}

		const hasTotpState =
			user.mfaSecret !== null ||
			(Array.isArray(user.mfaRecoveryCodes) && user.mfaRecoveryCodes.length > 0);
		const hasWebauthnCredentials =
			(await webauthnRepository.count({ where: { userId: user.id } })) > 0;

		if (!user.mfaEnabled && !hasTotpState && !hasWebauthnCredentials) {
			this.reportNoMfaConfiguredError(flags.email);
			return;
		}

		await mfaService.disableMfaForUser(user.id);

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

	private reportNoMfaConfiguredError(email: string) {
		this.logger.info(`User with email: ${email} has no two-factor authentication configured`);
	}
}
