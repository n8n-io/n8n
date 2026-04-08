import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { License } from '@/license';

import { BaseCommand } from '../base-command';

@Command({
	name: 'license:clear',
	description: 'Clear local license certificate',
})
export class ClearLicenseCommand extends BaseCommand {
	async run() {
		this.logger.info('Clearing license from database.');

		// Attempt to invoke shutdown() to force any floating entitlements to be released
		const license = Container.get(License);
		await license.init({ isCli: true });
		await license.clear();
		this.logger.info('Done. Restart n8n to take effect.');
	}

	async catch(error: Error) {
		this.logger.error('Error. See log messages for details.');
		this.logger.error('\nGOT ERROR');
		this.logger.info('====================================');
		this.logger.error(error.message);
		this.logger.error(error.stack!);
	}
}
