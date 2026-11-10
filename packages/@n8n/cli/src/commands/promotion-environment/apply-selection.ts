import { Args, Flags } from '@oclif/core';

import { PromotionApplyCommand, selectionContinueCommand } from './apply-command';
import { expectedSourceFlags, toExpectedSource } from './expected-source';
import { BaseCommand } from '../../base-command';

export default class PromotionEnvironmentApplySelection extends PromotionApplyCommand {
	static override description =
		"Apply a chosen set of a project's workflow and folder changes from its Apply branch. The project's name, icon, description and telemetry tags always come from the branch, so a call without --workflow and --folder applies only the project. Selected IDs on the branch are imported, and a selected workflow that this project owns but the branch does not hold is removed. Unselected content stays unchanged. A selected workflow moves within the project to match the branch, together with the folders that hold it, and those folders take the name on the branch. A selected workflow, or a folder that the branch holds in this project, that the branch and this instance hold in different projects is refused before any write. Pass the three --expected-* flags to apply only the reviewed commit. Exits 3 when the source changed since the review and 4 when bindings must be set up first; nothing is imported in either case. Requires the project's Apply environment, or the instance Apply environment, to be connected first.";

	static override examples = [
		'<%= config.bin %> promotion-environment apply-selection proj-abc -w wf-1 -w wf-2',
		'<%= config.bin %> promotion-environment apply-selection proj-abc --folder folder-1',
		'<%= config.bin %> promotion-environment apply-selection proj-abc',
		'<%= config.bin %> promotion-environment apply-selection proj-abc -w wf-1 --expected-environment-id=env-1 --expected-branch=main --expected-commit-sha=<full sha>',
	];

	static override args = { projectId: Args.string({ description: 'Project ID', required: true }) };

	static override flags = {
		...BaseCommand.baseFlags,
		workflow: Flags.string({
			char: 'w',
			description: 'Workflow ID to apply (repeat for more than one)',
			multiple: true,
		}),
		folder: Flags.string({
			description: 'Folder ID to apply (repeat for more than one)',
			multiple: true,
		}),
		...expectedSourceFlags({ required: false }),
	};

	async run() {
		const { args, flags } = await this.parse(PromotionEnvironmentApplySelection);
		const selection = { workflowIds: flags.workflow, folderIds: flags.folder };
		await this.execute(async () => {
			const result = await this.getClient(flags).applyProjectSelection(
				args.projectId,
				selection,
				toExpectedSource(flags),
			);
			this.reportApplyResult(result, flags, selectionContinueCommand(args.projectId, selection));
		});
	}
}
