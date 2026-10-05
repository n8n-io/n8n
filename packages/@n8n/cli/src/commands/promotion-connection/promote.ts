import { Args, Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class PromotionConnectionPromote extends BaseCommand {
	static override description =
		'Export all team projects, commit, and push to the configured branch. Requires the Promote direction to be cloned first.';

	static override examples = [
		'<%= config.bin %> promotion-connection promote conn-1 --message="Promote team projects"',
	];

	static override args = { id: Args.string({ description: 'Connection ID', required: true }) };

	static override flags = {
		...BaseCommand.baseFlags,
		message: Flags.string({
			char: 'm',
			description: 'Commit message for the promotion',
			required: true,
		}),
		force: Flags.boolean({
			description: 'Overwrite the remote branch even if it has diverged',
			default: false,
		}),
	};

	async run() {
		const { args, flags } = await this.parse(PromotionConnectionPromote);
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
