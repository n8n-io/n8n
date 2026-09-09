import { Args, Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class GitConnectionsPush extends BaseCommand {
	static override description =
		'Export all team projects, commit, and push to the configured branch. Requires the repository to be cloned first.';
	static override args = {
		id: Args.string({ description: 'ID of the Git connection', required: true }),
	};
	static override flags = {
		...BaseCommand.baseFlags,
		message: Flags.string({
			char: 'm',
			description: 'Commit message for the push',
			required: true,
		}),
		force: Flags.boolean({
			description: 'Overwrite the remote branch even if it has diverged',
			default: false,
		}),
	};

	async run() {
		const { args, flags } = await this.parse(GitConnectionsPush);
		await this.execute(async () => {
			const result = await this.getClient(flags).pushGitConnectionProjects(args.id, {
				commitMessage: flags.message,
				force: flags.force,
			});
			this.succeed(
				`Projects pushed to Git connection ${args.id} as commit ${result.commitSha}.`,
				flags,
				result,
			);
		});
	}
}
