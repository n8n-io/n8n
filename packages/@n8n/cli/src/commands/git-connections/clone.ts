import { Args, Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class GitConnectionsClone extends BaseCommand {
	static override description = 'Clone a Git connection';
	static override args = { id: Args.string({ description: 'Git connection ID', required: true }) };
	static override flags = {
		...BaseCommand.baseFlags,
		branchName: Flags.string({ description: 'Remote branch to clone', aliases: ['branch-name'] }),
	};

	async run() {
		const { args, flags } = await this.parse(GitConnectionsClone);
		await this.execute(async () => {
			this.output(await this.getClient(flags).cloneGitConnection(args.id, flags.branchName), flags);
		});
	}
}
