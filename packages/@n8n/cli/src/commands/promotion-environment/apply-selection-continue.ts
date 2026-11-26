import { Args, Flags } from '@oclif/core';

import {
	PromotionApplyCommand,
	selectionContinueCommand,
	selectionPreviewCommand,
} from './apply-command';
import {
	expectedPreviewRevisionFlag,
	expectedSourceFlags,
	toExpectedSource,
} from './expected-source';
import { confirmMissingDependenciesFlag } from './missing-dependencies';
import { BaseCommand } from '../../base-command';

export default class PromotionEnvironmentApplySelectionContinue extends PromotionApplyCommand {
	static override description =
		'Continue a selection Apply that was blocked on bindings, after they are set up. Resend the same --workflow and --folder flags, and pass the environment ID, branch, and commit SHA that the blocked Apply reported. Exits 3 when the reviewed source or preview no longer matches and 4 when bindings are still missing, a destructive data table change is not confirmed with --confirm-destructive-changes, or missing dependencies that do not stop the Apply are not confirmed with --confirm-missing-dependencies; nothing is imported in either case. On exit 4, the output lists the missing dependencies of the workflows by group, but only when the Apply has missing dependencies and you do not pass --quiet.';

	static override examples = [
		'<%= config.bin %> promotion-environment apply-selection-continue proj-abc -w wf-1 --expected-environment-id=env-1 --expected-branch=main --expected-commit-sha=<full sha>',
		'<%= config.bin %> promotion-environment apply-selection-continue proj-abc -w wf-1 --expected-environment-id=env-1 --expected-branch=main --expected-commit-sha=<full sha> --confirm-missing-dependencies',
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
		...expectedSourceFlags({ required: true }),
		...expectedPreviewRevisionFlag('applySelection'),
		confirmDestructiveChanges: Flags.boolean({
			description:
				'Also apply data table changes that remove or retype columns. The values in those columns are removed.',
			aliases: ['confirm-destructive-changes'],
		}),
		...confirmMissingDependenciesFlag('Apply'),
	};

	async run() {
		const { args, flags } = await this.parse(PromotionEnvironmentApplySelectionContinue);
		const expectedSource = toExpectedSource(flags);
		// oclif enforces the required flags, so this only narrows the type.
		if (!expectedSource) this.error('Pass all three --expected-* flags');
		const selection = { workflowIds: flags.workflow, folderIds: flags.folder };
		await this.execute(async () => {
			const result = await this.getClient(flags).continueApplyProjectSelection(
				args.projectId,
				selection,
				expectedSource,
				flags.confirmDestructiveChanges,
				flags.expectedPreviewRevision,
				flags.confirmMissingDependencies,
			);
			this.reportApplyResult(
				result,
				flags,
				selectionContinueCommand(args.projectId, selection),
				selectionPreviewCommand(args.projectId),
			);
		});
	}
}
