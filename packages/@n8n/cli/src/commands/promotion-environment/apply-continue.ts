import { Args, Flags } from '@oclif/core';

import {
	PromotionApplyCommand,
	environmentContinueCommand,
	environmentPreviewCommand,
} from './apply-command';
import {
	expectedPreviewRevisionFlag,
	expectedSourceFlags,
	toExpectedSource,
} from './expected-source';
import { BaseCommand } from '../../base-command';

export default class PromotionEnvironmentApplyContinue extends PromotionApplyCommand {
	static override description =
		'Continue a blocked Apply after you resolve its bindings, access requirements, or conflicts. Pass the environment ID, branch, and commit SHA that the blocked Apply reported. Pass --expected-preview-revision to continue only when this instance still matches the reviewed preview; --confirm-destructive-changes then covers only the changes that this preview showed. Exits 3 when the reviewed source or preview no longer matches and 4 when bindings are still missing or a destructive data table change or project deletion is not confirmed with --confirm-destructive-changes; nothing is imported in either case.';

	static override examples = [
		'<%= config.bin %> promotion-environment apply-continue env-1 --expected-environment-id=env-1 --expected-branch=main --expected-commit-sha=<full sha>',
		'<%= config.bin %> promotion-environment apply-continue env-1 --expected-environment-id=env-1 --expected-branch=main --expected-commit-sha=<full sha> --expected-preview-revision=<revision> --confirm-destructive-changes',
	];

	static override args = { id: Args.string({ description: 'Environment ID', required: true }) };

	static override flags = {
		...BaseCommand.baseFlags,
		...expectedSourceFlags({ required: true }),
		...expectedPreviewRevisionFlag,
		confirmDestructiveChanges: Flags.boolean({
			description:
				'Also apply data table changes that remove or retype columns, and delete the team projects that the package does not hold. The values in those columns and everything in those projects are removed.',
			aliases: ['confirm-destructive-changes'],
		}),
	};

	async run() {
		const { args, flags } = await this.parse(PromotionEnvironmentApplyContinue);
		const expectedSource = toExpectedSource(flags);
		// oclif enforces the required flags, so this only narrows the type.
		if (!expectedSource) this.error('Pass all three --expected-* flags');
		await this.execute(async () => {
			const result = await this.getClient(flags).continueApplyPackage(
				args.id,
				expectedSource,
				flags.confirmDestructiveChanges,
				flags.expectedPreviewRevision,
			);
			this.reportApplyResult(
				result,
				flags,
				environmentContinueCommand(args.id),
				environmentPreviewCommand(args.id),
			);
		});
	}
}
