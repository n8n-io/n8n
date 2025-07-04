import { SettingsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { Flags } from '@oclif/core';

import { SAML_PREFERENCES_DB_KEY } from '../../sso.ee/saml/constants';
import { setSamlLoginEnabled } from '../../sso.ee/saml/saml-helpers';
import { BaseCommand } from '../base-command';

export class DisableSaml extends BaseCommand {
	static description =
		'\nDisables SAML authentication and reverts to email-based authentication.\n';

	static examples = ['$ n8n user-management:disable-saml'];

	static flags = {
		help: Flags.help({ char: 'h' }),
	};

	async run(): Promise<void> {
		const settingsRepository = Container.get(SettingsRepository);

		// Check if SAML is configured
		const samlPreferences = await settingsRepository.findOne({
			where: { key: SAML_PREFERENCES_DB_KEY },
		});

		if (!samlPreferences) {
			this.logger.info('SAML is not configured, nothing to disable.');
			return;
		}

		try {
			// Disable SAML login and switch to email authentication
			await setSamlLoginEnabled(false);

			// Remove SAML configuration from database
			await settingsRepository.delete({ key: SAML_PREFERENCES_DB_KEY });

			this.logger.info(
				'Successfully disabled SAML authentication and reverted to email-based authentication.',
			);
		} catch (error) {
			this.logger.error('Error disabling SAML authentication');
		}
	}

	async catch(error: Error): Promise<void> {
		this.logger.error('Error disabling SAML. See log messages for details.');
		this.logger.error(error.message);
	}
}
