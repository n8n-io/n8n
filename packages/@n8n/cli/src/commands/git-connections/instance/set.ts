import { Flags } from '@oclif/core';

import { BaseCommand } from '../../../base-command';

export default class GitConnectionsInstanceSet extends BaseCommand {
	static override description = 'Update the instance Git connection settings from JSON';
	static override flags = {
		...BaseCommand.baseFlags,
		file: Flags.string({ description: 'Path to instance Git settings JSON file' }),
		stdin: Flags.boolean({
			description: 'Read instance Git settings JSON from stdin',
			default: false,
		}),
	};

	async run() {
		const { flags } = await this.parse(GitConnectionsInstanceSet);
		await this.execute(async () => {
			const body = JSON.parse(this.readInput(flags)) as unknown;
			this.output(await this.getClient(flags).updateInstanceGitSettings(body), flags);
		});
	}
}
