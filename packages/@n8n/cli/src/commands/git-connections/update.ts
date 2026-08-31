import { Args, Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class GitConnectionsUpdate extends BaseCommand {
	static override description = 'Update a Git connection from JSON';
	static override args = { id: Args.string({ description: 'Git connection ID', required: true }) };
	static override flags = {
		...BaseCommand.baseFlags,
		file: Flags.string({ description: 'Path to Git connection JSON file' }),
		stdin: Flags.boolean({ description: 'Read Git connection JSON from stdin', default: false }),
	};

	async run() {
		const { args, flags } = await this.parse(GitConnectionsUpdate);
		await this.execute(async () => {
			const body = JSON.parse(this.readInput(flags)) as unknown;
			this.output(await this.getClient(flags).updateGitConnection(args.id, body), flags);
		});
	}
}
