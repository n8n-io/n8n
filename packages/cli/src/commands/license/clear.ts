/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable no-console */
import { Command } from '@oclif/command';

import { LoggerProxy } from 'n8n-workflow';

import * as Db from '@/Db';

import { getLogger } from '@/Logger';
import { SETTINGS_LICENSE_CERT_KEY } from '@/constants';

export class ClearLicenseCommand extends Command {
	static description = 'Clear license';

	static examples = [`$ n8n clear:license`];

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	async run() {
		const logger = getLogger();
		LoggerProxy.init(logger);

		try {
			await Db.init();

			console.info('Clearing license from database.');
			await Db.collections.Settings.delete({
				key: SETTINGS_LICENSE_CERT_KEY,
			});
			console.info('Done');
		} catch (e) {
			console.error('Error updating database. See log messages for details.');
			logger.error('\nGOT ERROR');
			logger.info('====================================');
			logger.error(e.message);
			logger.error(e.stack);
			this.exit(1);
		}

		this.exit();
	}
}
