import { Command } from '@oclif/core';

import { detectPackageManager } from '../utils/package-manager';

export default class Prerelease extends Command {
	static override description =
		'Only for internal use. Prevent npm publish, instead require npm run release';
	static override examples = ['<%= config.bin %> <%= command.id %>'];
	static override flags = {};
	static override hidden = true;

	async run(): Promise<void> {
		await this.parse(Prerelease);

		const packageManager = (await detectPackageManager()) ?? 'npm';

		if (!process.env.RELEASE_MODE) {
			this.log(`Run \`${packageManager} run release\` to publish the package`);
			process.exit(1);
		}
	}
}
