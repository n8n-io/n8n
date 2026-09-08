import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class GitConnectionsRemoveProject extends BaseCommand {
	static override description = 'Remove a project from a Git connection';
	static override args = {
		id: Args.string({ description: 'Git connection ID', required: true }),
		projectId: Args.string({ description: 'Project ID', required: true }),
	};

	static override flags = { ...BaseCommand.baseFlags };

	async run() {
		const { args, flags } = await this.parse(GitConnectionsRemoveProject);
		await this.execute(async () => {
			await this.getClient(flags).removeProjectFromGitConnection(args.id, args.projectId);
			this.succeed(`Project ${args.projectId} removed from Git connection ${args.id}.`, flags, {
				id: args.id,
				projectId: args.projectId,
				removed: true,
			});
		});
	}
}
