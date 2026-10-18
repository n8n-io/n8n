import { Args, Flags } from '@oclif/core';

import { PromotionApplyCommand, selectionContinueCommand } from './apply-command';
import { expectedSourceFlags, toExpectedSource } from './expected-source';
import { BaseCommand } from '../../base-command';

export default class PromotionConnectionApplySelection extends PromotionApplyCommand {
	static override description =
		"Apply a chosen set of a project's workflow changes from its Apply branch. Selected IDs on the branch are imported, and instance workflows this project owns whose IDs are absent from the branch are removed. Unselected content stays unchanged. Pass the three --expected-* flags to apply only the reviewed commit. Exits 3 when the source changed since the review and 4 when bindings must be set up first; nothing is imported in either case. Requires the Apply direction to be cloned first.";

	static override examples = [
		'<%= config.bin %> promotion-connection apply-selection proj-abc -w wf-1 -w wf-2',
		'<%= config.bin %> promotion-connection apply-selection proj-abc -w wf-1 --expected-config-id=cfg-1 --expected-branch=main --expected-commit-sha=<full sha>',
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
		...expectedSourceFlags({ required: false }),
	};

	async run() {
		const { args, flags } = await this.parse(PromotionConnectionApplySelection);
		await this.execute(async () => {
			const result = await this.getClient(flags).applyProjectSelection(
				args.projectId,
				flags.workflow,
				toExpectedSource(flags),
			);
			this.reportApplyResult(
				result,
				flags,
				selectionContinueCommand(args.projectId, flags.workflow),
			);
		});
	}
}
