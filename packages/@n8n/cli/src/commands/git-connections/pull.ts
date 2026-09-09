import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class GitConnectionsPull extends BaseCommand {
	static override description =
		'Reset the local clone to the configured branch tip and import projects into the instance, overwriting to match. Requires the repository to be cloned first.';
	static override args = {
		id: Args.string({ description: 'ID of the Git connection', required: true }),
	};
	static override flags = { ...BaseCommand.baseFlags };

	async run() {
		const { args, flags } = await this.parse(GitConnectionsPull);
		await this.execute(async () => {
			const result = await this.getClient(flags).pullGitConnectionProjects(args.id);
			this.succeed(
				`Projects pulled into the instance from Git connection ${args.id} at commit ${result.commitSha}.`,
				flags,
				result,
			);
		});
	}
}
