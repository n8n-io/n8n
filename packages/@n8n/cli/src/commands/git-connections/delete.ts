import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class GitConnectionsDelete extends BaseCommand {
	static override description = 'Delete a Git connection';
	static override args = { id: Args.string({ description: 'Git connection ID', required: true }) };
	static override flags = { ...BaseCommand.baseFlags };

	async run() {
		const { args, flags } = await this.parse(GitConnectionsDelete);
		await this.execute(async () => {
			await this.getClient(flags).deleteGitConnection(args.id);
			this.succeed(`Git connection ${args.id} deleted.`, flags, { id: args.id, deleted: true });
		});
	}
}
