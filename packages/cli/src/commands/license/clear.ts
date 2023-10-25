import * as Db from '@/Db';
import { SETTINGS_LICENSE_CERT_KEY } from '@/constants';
import { BaseCommand } from '../BaseCommand';

export class ClearLicenseCommand extends BaseCommand {
	static description = 'Clear license';

	static examples = ['$ n8n clear:license'];

	async run() {
		this.logger.info('Clearing license from database.');
		await Db.collections.Settings.delete({
			key: SETTINGS_LICENSE_CERT_KEY,
		});
		this.logger.info('Done. Restart n8n to take effect.');
	}

	async catch(error: Error) {
		this.logger.error('Error updating database. See log messages for details.');
		this.logger.error('\nGOT ERROR');
		this.logger.info('====================================');
		this.logger.error(error.message);
		this.logger.error(error.stack!);
	}
}
