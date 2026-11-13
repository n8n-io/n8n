import { Args } from '@oclif/core';

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

export default class PromotionEnvironmentApply extends PromotionApplyCommand {
	static override description =
		'Reset the local checkout to the configured branch tip and import the package, overwriting the instance to match. Pass the three --expected-environment-id, --expected-branch and --expected-commit-sha flags to apply only the reviewed commit, and --expected-preview-revision to apply only when this instance still matches the reviewed preview from list-apply-changes. Exits 3 when the reviewed source or preview no longer matches and 4 when bindings must be set up first; nothing is imported in either case. Workflows and folders move within their project to match the branch, and folders take the name on the branch. A workflow or folder that the branch and this instance hold in different projects is refused before any write. Requires a connected Apply environment with instance scope.';

	static override examples = [
		'<%= config.bin %> promotion-environment apply env-1',
		'<%= config.bin %> promotion-environment apply env-1 --expected-environment-id=env-1 --expected-branch=main --expected-commit-sha=<full sha>',
		'<%= config.bin %> promotion-environment apply env-1 --expected-environment-id=env-1 --expected-branch=main --expected-commit-sha=<full sha> --expected-preview-revision=<revision>',
	];

	static override args = { id: Args.string({ description: 'Environment ID', required: true }) };

	static override flags = {
		...BaseCommand.baseFlags,
		...expectedSourceFlags({ required: false }),
		...expectedPreviewRevisionFlag,
	};

	async run() {
		const { args, flags } = await this.parse(PromotionEnvironmentApply);
		await this.execute(async () => {
			const result = await this.getClient(flags).applyPackage(
				args.id,
				toExpectedSource(flags),
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
