import { Args, Flags } from '@oclif/core';

import { confirmGapFlag, formatDependencyReport } from './dependency-report';
import { BaseCommand } from '../../base-command';

export default class PromotionEnvironmentPromote extends BaseCommand {
	static override description =
		'Export all team projects, commit, and push to the configured branch. A workflow on the branch that moved to a personal project is refused, because Apply would delete it on the destination. A workflow or folder that moved to another team project is refused too, while its old project still exists. The command fails with status 409 and lists the dependency gaps when the environment is strict and gaps exist, or when the gaps differ from --confirm-gap. Requires a connected Promote environment with instance scope.';

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
		...confirmGapFlag('promotions'),
	};

	async run() {
		const { args, flags } = await this.parse(PromotionEnvironmentPromote);
		await this.execute(async () => {
			const result = await this.getClient(flags).promotePackage(args.id, {
				commitMessage: flags.message,
				force: flags.force,
				confirmedGapIds: flags.confirmGap,
			});
			if (result.dependencyReport && !flags.quiet && !this.isJsonMode(flags)) {
				const lines = formatDependencyReport(result.dependencyReport);
				if (lines.length > 0) this.logToStderr(lines.join('\n'));
			}
			this.succeed(
				`Promoted to ${result.git.branchName} as commit ${result.git.commitSha}.`,
				flags,
				result,
			);
		});
	}
}
