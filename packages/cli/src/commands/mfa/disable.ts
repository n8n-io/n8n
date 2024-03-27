import Container from 'typedi';
import { Flags } from '@oclif/core';
import { UserRepository } from '@db/repositories/user.repository';
import { BaseCommand } from '../BaseCommand';

export class DisableMFACommand extends BaseCommand {
	static description = 'Disable MFA authentication for a user';

	static examples = ['$ n8n mfa:disable --email=johndoe@example.com'];

	static flags = {
		help: Flags.help({ char: 'h' }),
		email: Flags.string({
			description: 'The email of the user to disable the MFA authentication',
		}),
	};

	async init() {
		await super.init();
	}

	async run(): Promise<void> {
		const { flags } = await this.parse(DisableMFACommand);

		if (!flags.email) {
			this.logger.info('An email with --email must be provided');
			return;
		}

		const user = await Container.get(UserRepository).findOneBy({ email: flags.email });

		if (!user) {
			this.reportUserDoesNotExistError(flags.email);
			return;
		}

		if (
			user.mfaSecret === null &&
			Array.isArray(user.mfaRecoveryCodes) &&
			user.mfaRecoveryCodes.length === 0 &&
			!user.mfaEnabled
		) {
			this.reportUserDoesNotExistError(flags.email);
			return;
		}

		Object.assign(user, { mfaSecret: null, mfaRecoveryCodes: [], mfaEnabled: false });

		await Container.get(UserRepository).save(user);

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
