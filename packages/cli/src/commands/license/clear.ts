import { Command } from '@oclif/command';

import { LoggerProxy } from 'n8n-workflow';

import * as Db from '@/Db';

import { getLogger } from '@/Logger';
import { SETTINGS_LICENSE_CERT_KEY } from '@/constants';

export class ClearLicenseCommand extends Command {
	static description = 'Clear license';

	static examples = [`$ n8n clear:license`];

	async run() {
		const logger = getLogger();
		LoggerProxy.init(logger);

		try {
			await Db.init();

			console.info('Clearing license from database.');
			await Db.collections.Settings.delete({
				key: SETTINGS_LICENSE_CERT_KEY,
			});
			console.info('Done. Restart n8n to take effect.');
		} catch (e: unknown) {
			console.error('Error updating database. See log messages for details.');
			logger.error('\nGOT ERROR');
			logger.info('====================================');
			if (e instanceof Error) {
				logger.error(e.message);
				if (e.stack) {
					logger.error(e.stack);
				}
			}
			this.exit(1);
		}

		this.exit();
	}
}
