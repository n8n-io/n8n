import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class GitConnectionsAssignProject extends BaseCommand {
	static override description = 'Assign a team project to a Git connection';
	static override args = {
		id: Args.string({ description: 'Git connection ID', required: true }),
		projectId: Args.string({ description: 'Project ID', required: true }),
	};

	static override flags = { ...BaseCommand.baseFlags };

	async run() {
		const { args, flags } = await this.parse(GitConnectionsAssignProject);
		await this.execute(async () => {
			this.output(
				await this.getClient(flags).assignProjectToGitConnection(args.id, args.projectId),
				flags,
			);
		});
	}
}
