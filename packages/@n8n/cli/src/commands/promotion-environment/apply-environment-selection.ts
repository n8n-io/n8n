import { Args, Flags } from '@oclif/core';

import { PromotionApplyCommand, environmentSelectionContinueCommand } from './apply-command';
import { applyConfirmationFlags, toApplyConfirmations } from './dependency-report';
import { environmentSelectionFlags, toEnvironmentSelection } from './environment-selection';
import {
	expectedPreviewRevisionFlag,
	expectedSourceFlags,
	toExpectedSource,
} from './expected-source';
import { BaseCommand } from '../../base-command';

export default class PromotionEnvironmentApplyEnvironmentSelection extends PromotionApplyCommand {
	static override description =
		'Apply items of one or more projects from the branch of an Apply environment in one plan. A reference to a workflow of the same Apply counts as present, in any project of the selection. Name each item with its project, as <projectId>:<id>. The details of each listed project always come from the branch. Selected IDs on the branch are imported, and a selected workflow that its project owns but the branch does not hold is removed. --credential selects a credential that the branch holds under the project: Apply updates it when this instance holds it, and reports it as a missing binding when not. The environment must cover each project, and you need the right to apply in each of them. Pass the three --expected-* flags to apply only the reviewed commit, and --expected-preview-revision to apply only when this instance still matches the reviewed preview. Exits 3 when the reviewed source or preview no longer matches and 4 when bindings must be set up first or the dependency gaps changed; nothing is imported in either case. To continue after the binding step, run the same command again with the --expected-* flags.';

	static override examples = [
		'<%= config.bin %> promotion-environment apply-environment-selection env-2 -w proj-a:wf-1 -w proj-b:wf-2',
		'<%= config.bin %> promotion-environment apply-environment-selection env-2 -w proj-a:wf-1 --credential proj-b:cred-1',
		'<%= config.bin %> promotion-environment apply-environment-selection env-2 -w proj-a:wf-1 --expected-environment-id=env-2 --expected-branch=main --expected-commit-sha=<full sha> --confirm-destructive-changes',
	];

	static override args = {
		environmentId: Args.string({ description: 'Apply environment ID', required: true }),
	};

	static override flags = {
		...BaseCommand.baseFlags,
		...environmentSelectionFlags('apply'),
		...expectedSourceFlags({ required: false }),
		...expectedPreviewRevisionFlag,
		confirmDestructiveChanges: Flags.boolean({
			description:
				'Also apply data table changes that remove or retype columns, and move the selected workflows and folders out of a project that the branch does not hold. The values in those columns are removed.',
			aliases: ['confirm-destructive-changes'],
		}),
		...applyConfirmationFlags,
	};

	async run() {
		const { args, flags } = await this.parse(PromotionEnvironmentApplyEnvironmentSelection);
		const projects = toEnvironmentSelection(flags);
		await this.execute(async () => {
			const result = await this.getClient(flags).applyEnvironmentSelection(args.environmentId, {
				projects,
				expectedSource: toExpectedSource(flags),
				expectedPreviewRevision: flags.expectedPreviewRevision,
				// Dropped by JSON serialization when not set.
				confirmDestructiveChanges: flags.confirmDestructiveChanges || undefined,
				...toApplyConfirmations(flags),
			});
			this.reportApplyResult(
				result,
				flags,
				environmentSelectionContinueCommand(args.environmentId, projects),
			);
		});
	}
}
