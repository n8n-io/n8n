import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class GitConnectionsDisconnect extends BaseCommand {
	static override description = 'Disconnect a Git connection';
	static override args = { id: Args.string({ description: 'Git connection ID', required: true }) };
	static override flags = { ...BaseCommand.baseFlags };

	async run() {
		const { args, flags } = await this.parse(GitConnectionsDisconnect);
		await this.execute(async () => {
			this.output(await this.getClient(flags).disconnectGitConnection(args.id), flags);
		});
	}
}
