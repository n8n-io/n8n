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

		// Write to stdout so output is independent of N8N_LOG_LEVEL.
		process.stdout.write(license.getInfo() + '\n');
	}

	async catch(error: Error) {
		process.stderr.write('\nGOT ERROR\n');
		process.stderr.write('====================================\n');
		process.stderr.write(error.message + '\n');
	}
}
