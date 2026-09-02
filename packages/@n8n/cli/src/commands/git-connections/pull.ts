import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class GitConnectionsPull extends BaseCommand {
	static override description =
		'Import all projects from a Git connection working copy into the instance, overwriting to match it (work in progress; does not pull from the remote)';
	static override args = {
		id: Args.string({ description: 'ID of the Git connection', required: true }),
	};
	static override flags = { ...BaseCommand.baseFlags };

	async run() {
		const { args, flags } = await this.parse(GitConnectionsPull);
		await this.execute(async () => {
			const result = await this.getClient(flags).pullGitConnectionProjects(args.id);
			this.succeed(
				`Projects imported from the local working copy for Git connection ${args.id}. This work-in-progress command imported whatever the last clone produced; it did not pull from the remote.`,
				flags,
				result,
			);
		});
	}
}
