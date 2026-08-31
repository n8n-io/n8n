import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class GitConnectionsGet extends BaseCommand {
	static override description = 'Get a Git connection by ID';
	static override args = { id: Args.string({ description: 'Git connection ID', required: true }) };
	static override flags = { ...BaseCommand.baseFlags };

	async run() {
		const { args, flags } = await this.parse(GitConnectionsGet);
		await this.execute(async () => {
			this.output(await this.getClient(flags).getGitConnection(args.id), flags);
		});
	}
}
