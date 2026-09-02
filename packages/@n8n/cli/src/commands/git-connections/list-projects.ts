import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class GitConnectionsListProjects extends BaseCommand {
	static override description = 'List projects added to a Git connection';
	static override args = { id: Args.string({ description: 'Git connection ID', required: true }) };
	static override flags = { ...BaseCommand.baseFlags };

	async run() {
		const { args, flags } = await this.parse(GitConnectionsListProjects);
		await this.execute(async () => {
			this.output(await this.getClient(flags).listGitConnectionProjects(args.id), flags);
		});
	}
}
