import { Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class GitConnectionsCreate extends BaseCommand {
	static override description = 'Create a Git connection from JSON';
	static override flags = {
		...BaseCommand.baseFlags,
		file: Flags.string({ description: 'Path to Git connection JSON file' }),
		stdin: Flags.boolean({ description: 'Read Git connection JSON from stdin', default: false }),
	};

	async run() {
		const { flags } = await this.parse(GitConnectionsCreate);
		await this.execute(async () => {
			const body = JSON.parse(this.readInput(flags)) as unknown;
			this.output(await this.getClient(flags).createGitConnection(body), flags);
		});
	}
}
