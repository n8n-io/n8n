import { Container } from '@n8n/di';

import { License } from '@/license';

import { BaseCommand } from '../base-command';

export class LicenseInfoCommand extends BaseCommand {
	static description = 'Print license information';

	static examples = ['$ n8n license:info'];

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
