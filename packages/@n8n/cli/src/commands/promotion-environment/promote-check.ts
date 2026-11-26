import { Args } from '@oclif/core';

import { shellQuote } from './apply-command';
import { promoteDependencyLines } from './missing-dependencies';
import { promoteConfirmCommand } from './promote-command';
import { BaseCommand } from '../../base-command';

export default class PromotionEnvironmentPromoteCheck extends BaseCommand {
	static override description =
		'List what a Promote of all team projects does not include, before you promote. Missing dependencies are the credentials, sub-workflows and error workflows that the workflows use and that the branch does not hold after the Promote. Warnings are the references to a credential, workflow or variable that does not exist on this instance. The command lists them by group and never names the project of a dependency. When dependencies are missing, the output ends with the promote command that confirms exactly the listed dependencies. The command changes nothing, and it exits 0 with or without entries. Use --json for the full check. Requires a Promote environment with instance scope.';

	static override examples = [
		'<%= config.bin %> promotion-environment promote-check env-1',
		'<%= config.bin %> promotion-environment promote-check env-1 --json',
	];

	static override args = { id: Args.string({ description: 'Environment ID', required: true }) };

	static override flags = {
		...BaseCommand.baseFlags,
	};

	async run() {
		const { args, flags } = await this.parse(PromotionEnvironmentPromoteCheck);
		await this.execute(async () => {
			const check = await this.getClient(flags).getPromoteCheck(args.id);
			if (this.isJsonMode(flags)) {
				this.output(check, flags);
				return;
			}
			if (flags.quiet) return;
			const dependencies = promoteDependencyLines(check.missingDependencies, check.warnings);
			// Warnings alone need no confirmation.
			const confirmation =
				check.missingDependencies.length > 0
					? [
							'',
							'The Promote needs --confirm-missing-dependencies. To confirm exactly this list, run:',
							`  ${promoteConfirmCommand(`promote ${shellQuote(args.id)}`, { expectedPreviewRevision: check.revision })}`,
						]
					: [];
			this.log(
				dependencies.length > 0
					? [...dependencies, ...confirmation].join('\n')
					: 'No missing dependencies and no warnings.',
			);
		});
	}
}
