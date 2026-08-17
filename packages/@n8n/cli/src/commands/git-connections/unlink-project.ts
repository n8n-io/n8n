import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class GitConnectionsUnlinkProject extends BaseCommand {
	static override description = 'Un-link a project from a Git connection';
	static override args = {
		id: Args.string({ description: 'Git connection ID', required: true }),
		projectId: Args.string({ description: 'Project ID', required: true }),
	};

	static override flags = { ...BaseCommand.baseFlags };

	async run() {
		const { args, flags } = await this.parse(GitConnectionsUnlinkProject);
		await this.execute(async () => {
			await this.getClient(flags).unlinkProjectFromGitConnection(args.id, args.projectId);
			this.succeed(`Project ${args.projectId} un-linked from Git connection ${args.id}.`, flags, {
				id: args.id,
				projectId: args.projectId,
				unlinked: true,
			});
		});
	}
}
