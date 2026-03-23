import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { License } from '@/license';

import { BaseCommand } from '../base-command';

@Command({
	name: 'license:info',
	description: 'Print license information',
})
export class LicenseInfoCommand extends BaseCommand {
	async run() {
		const license = Container.get(License);
		await license.init({ isCli: true });

		this.logger.info('Printing license information:\n' + license.getInfo());
	}

	async catch(error: Error) {
		this.logger.error('\nGOT ERROR');
		this.logger.info('====================================');
		this.logger.error(error.message);
	}
}
