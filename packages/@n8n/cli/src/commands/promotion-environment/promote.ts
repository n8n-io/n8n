import { Args, Flags } from '@oclif/core';

import { shellQuote } from './apply-command';
import { expectedPreviewRevisionFlag } from './expected-source';
import { confirmMissingDependenciesFlag } from './missing-dependencies';
import { PromotionPromoteCommand, promoteConfirmCommand } from './promote-command';
import { BaseCommand } from '../../base-command';

export default class PromotionEnvironmentPromote extends PromotionPromoteCommand {
	static override description =
		'Export all team projects, commit, and push to the configured branch. A workflow on the branch that moved to a personal project is refused, because Apply would delete it on the destination. A workflow or folder that moved to another team project is refused too, while its old project still exists. When the workflows have missing dependencies, nothing is pushed and the command exits with code 4, until you pass --confirm-missing-dependencies. With --expected-preview-revision, nothing is pushed when the Promote check changed since you reviewed it, and the command exits with code 3. Requires a Promote environment with instance scope.';

	static override examples = [
		'<%= config.bin %> promotion-environment promote env-1',
		'<%= config.bin %> promotion-environment promote env-1 --message="Promote team projects"',
		'<%= config.bin %> promotion-environment promote env-1 --expected-preview-revision=<revision> --confirm-missing-dependencies',
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
		...expectedPreviewRevisionFlag('promote'),
		...confirmMissingDependenciesFlag('Promote'),
	};

	async run() {
		const { args, flags } = await this.parse(PromotionEnvironmentPromote);
		await this.execute(async () => {
			const result = await this.getClient(flags).promotePackage(args.id, {
				commitMessage: flags.message,
				force: flags.force,
				expectedPreviewRevision: flags.expectedPreviewRevision,
				confirmMissingDependencies: flags.confirmMissingDependencies,
			});
			this.reportPromoteResult(result, flags, {
				promoted: 'Promoted',
				previewChanged: [
					'The Promote check changed since you reviewed it. Nothing was pushed.',
					'Run promote-check again. Review the lists. Then promote with the new revision.',
				].join('\n'),
				confirmCommand: promoteConfirmCommand(
					`promote ${shellQuote(args.id)}${flags.force ? ' --force' : ''}`,
					flags,
				),
			});
		});
	}
}
