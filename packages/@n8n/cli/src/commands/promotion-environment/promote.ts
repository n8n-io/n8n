import { Args, Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class PromotionEnvironmentPromote extends BaseCommand {
	static override description =
		'Export all team projects, commit, and push to the configured branch. A workflow on the branch that moved to a personal project is refused, because Apply would delete it on the destination. A workflow or folder that moved to another team project is refused too, while its old project still exists. Requires a connected Promote environment with instance scope.';

	static override examples = [
		'<%= config.bin %> promotion-environment promote env-1',
		'<%= config.bin %> promotion-environment promote env-1 --message="Promote team projects"',
	];

	static override args = { id: Args.string({ description: 'Environment ID', required: true }) };

	static override flags = {
		...BaseCommand.baseFlags,
		message: Flags.string({
			char: 'm',
			description:
				'Commit message for the promotion. If you omit it, the commit uses a generated message.',
		}),
		force: Flags.boolean({
			description: 'Overwrite the remote branch even if it has diverged',
			default: false,
		}),
	};

	async run() {
		const { args, flags } = await this.parse(PromotionEnvironmentPromote);
		await this.execute(async () => {
			const result = await this.getClient(flags).promotePackage(args.id, {
				commitMessage: flags.message,
				force: flags.force,
			});
			this.succeed(
				`Promoted to ${result.git.branchName} as commit ${result.git.commitSha}.`,
				flags,
				result,
			);
		});
	}
}
