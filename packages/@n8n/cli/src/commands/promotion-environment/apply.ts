import { Args } from '@oclif/core';

import { PromotionApplyCommand, environmentContinueCommand } from './apply-command';
import { expectedSourceFlags, toExpectedSource } from './expected-source';
import { BaseCommand } from '../../base-command';

export default class PromotionEnvironmentApply extends PromotionApplyCommand {
	static override description =
		'Reset the local checkout to the configured branch tip and import the package, overwriting the instance to match. Pass the three --expected-* flags to apply only the reviewed commit. Exits 3 when the source changed since the review and 4 when bindings must be set up first; nothing is imported in either case. Requires a connected Apply environment with instance scope.';

	static override examples = [
		'<%= config.bin %> promotion-environment apply env-1',
		'<%= config.bin %> promotion-environment apply env-1 --expected-environment-id=env-1 --expected-branch=main --expected-commit-sha=<full sha>',
	];

	static override args = { id: Args.string({ description: 'Environment ID', required: true }) };

	static override flags = {
		...BaseCommand.baseFlags,
		...expectedSourceFlags({ required: false }),
	};

	async run() {
		const { args, flags } = await this.parse(PromotionEnvironmentApply);
		await this.execute(async () => {
			const result = await this.getClient(flags).applyPackage(args.id, toExpectedSource(flags));
			this.reportApplyResult(result, flags, environmentContinueCommand(args.id));
		});
	}
}
