import { Args, Flags } from '@oclif/core';

import { PromotionApplyCommand, selectionContinueCommand } from './apply-command';
import { expectedSourceFlags, toExpectedSource } from './expected-source';
import { BaseCommand } from '../../base-command';

export default class PromotionConnectionApplySelectionContinue extends PromotionApplyCommand {
	static override description =
		'Continue a selection Apply that was blocked on bindings, after they are set up. Resend the same workflow ids, and pass the config ID, branch, and commit SHA that the blocked Apply reported. Exits 3 when the source changed since then and 4 when bindings are still missing; nothing is imported in either case.';

	static override examples = [
		'<%= config.bin %> promotion-connection apply-selection-continue proj-abc -w wf-1 --expected-config-id=cfg-1 --expected-branch=main --expected-commit-sha=<full sha>',
	];

	static override args = { projectId: Args.string({ description: 'Project ID', required: true }) };

	static override flags = {
		...BaseCommand.baseFlags,
		workflow: Flags.string({
			char: 'w',
			description: 'Workflow ID to apply (repeat for more than one)',
			multiple: true,
			required: true,
		}),
		...expectedSourceFlags({ required: true }),
	};

	async run() {
		const { args, flags } = await this.parse(PromotionConnectionApplySelectionContinue);
		const expectedSource = toExpectedSource(flags);
		// oclif enforces the required flags, so this only narrows the type.
		if (!expectedSource) this.error('Pass all three --expected-* flags');
		await this.execute(async () => {
			const result = await this.getClient(flags).continueApplyProjectSelection(
				args.projectId,
				flags.workflow,
				expectedSource,
			);
			this.reportApplyResult(
				result,
				flags,
				selectionContinueCommand(args.projectId, flags.workflow),
			);
		});
	}
}
