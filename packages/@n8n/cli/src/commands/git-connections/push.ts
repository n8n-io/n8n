import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class GitConnectionsPush extends BaseCommand {
	static override description =
		'Export all team projects to a Git connection working copy (work in progress; does not commit or push)';
	static override args = {
		id: Args.string({ description: 'ID of the Git connection', required: true }),
	};
	static override flags = { ...BaseCommand.baseFlags };

	async run() {
		const { args, flags } = await this.parse(GitConnectionsPush);
		await this.execute(async () => {
			const result = await this.getClient(flags).pushGitConnectionProjects(args.id);
			this.succeed(
				`Projects exported to the local working copy for Git connection ${args.id}. This work-in-progress command did not commit or push changes to the selected branch.`,
				flags,
				result,
			);
		});
	}
}
