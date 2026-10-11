import { Args } from '@oclif/core';

import { PromotionApplyCommand, connectionContinueCommand } from './apply-command';
import { expectedSourceFlags, toExpectedSource } from './expected-source';
import { BaseCommand } from '../../base-command';

export default class PromotionConnectionApplyContinue extends PromotionApplyCommand {
	static override description =
		'Continue an Apply that was blocked on bindings, after they are set up. Pass the config ID, branch, and commit SHA that the blocked Apply reported. Exits 3 when the source changed since then and 4 when bindings are still missing; nothing is imported in either case.';

	static override examples = [
		'<%= config.bin %> promotion-connection apply-continue conn-1 --expected-config-id=cfg-1 --expected-branch=main --expected-commit-sha=<full sha>',
	];

	static override args = { id: Args.string({ description: 'Connection ID', required: true }) };

	static override flags = {
		...BaseCommand.baseFlags,
		...expectedSourceFlags({ required: true }),
	};

	async run() {
		const { args, flags } = await this.parse(PromotionConnectionApplyContinue);
		const expectedSource = toExpectedSource(flags);
		// oclif enforces the required flags, so this only narrows the type.
		if (!expectedSource) this.error('Pass all three --expected-* flags');
		await this.execute(async () => {
			const result = await this.getClient(flags).continueApplyPackage(args.id, expectedSource);
			this.reportApplyResult(result, flags, connectionContinueCommand(args.id));
		});
	}
}
