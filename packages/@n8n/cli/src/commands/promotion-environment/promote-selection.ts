import { Args, Flags } from '@oclif/core';

import { BaseCommand, EXIT_BLOCKED, EXIT_SOURCE_CHANGED } from '../../base-command';
import { confirmGapFlag, formatDependencyReport, hasUnknownGap } from './dependency-report';
import { expectedPreviewRevisionFlag } from './expected-source';
import type { PromotionDependencyReport } from '../../client';

/** What a Promote says when it stops on its dependencies. Nothing was pushed. */
export function gapsChangedMessage(report: PromotionDependencyReport): string {
	return [
		'The Promote needs your decision on its dependencies. Nothing was pushed.',
		...formatDependencyReport(report),
		hasUnknownGap(report)
			? 'This version of the CLI does not know every gap. Update the CLI before you confirm a gap.'
			: report.allowIncomplete
				? 'Close the gaps, or pass each gap ID to --confirm-gap. Then promote again.'
				: 'Close the gaps, then promote again.',
	].join('\n');
}

export default class PromotionEnvironmentPromoteSelection extends BaseCommand {
	static override description =
		"Read a chosen set of a project's workflows and folders now and push their current state to the branch of the project's Promote environment, or of the instance Promote environment. The project's own details are always pushed, so a call without --workflow and --folder promotes only the project. A selected folder is pushed with the folders above it. Archived workflows stay on the branch as archived. A selected workflow that was deleted leaves this project's branch. A selected workflow that moved into or out of the project since the branch was written is refused. Move it back first. The request fails before any write if the branch does not hold a deleted workflow under this project. With --expected-preview-revision, nothing is pushed when the project or its branch changed since that preview, and the command exits with code 3. When the dependency gaps differ from --confirm-gap, or the environment is strict and gaps exist, nothing is pushed and the command exits with code 4. Requires that environment to be connected first.";

	static override examples = [
		'<%= config.bin %> promotion-environment promote-selection proj-abc -w wf-1 -w wf-2',
		'<%= config.bin %> promotion-environment promote-selection proj-abc --folder folder-1',
		'<%= config.bin %> promotion-environment promote-selection proj-abc',
		'<%= config.bin %> promotion-environment promote-selection proj-abc -w wf-1 --expected-preview-revision <revision>',
	];

	static override args = {
		projectId: Args.string({ description: 'Project ID', required: true }),
	};

	static override flags = {
		...BaseCommand.baseFlags,
		workflow: Flags.string({
			char: 'w',
			description: 'Workflow ID to promote (repeat for more than one)',
			multiple: true,
		}),
		folder: Flags.string({
			description: 'Folder ID to promote (repeat for more than one)',
			multiple: true,
		}),
		message: Flags.string({
			char: 'm',
			description: 'Commit message. If you omit it, the commit uses a generated message.',
		}),
		...expectedPreviewRevisionFlag,
		...confirmGapFlag('promotions'),
	};

	async run() {
		const { args, flags } = await this.parse(PromotionEnvironmentPromoteSelection);
		await this.execute(async () => {
			const result = await this.getClient(flags).promoteProjectSelection(
				args.projectId,
				{ workflowIds: flags.workflow, folderIds: flags.folder },
				flags.message,
				flags.expectedPreviewRevision,
				flags.confirmGap,
			);
			if (result.status === 'gaps-changed') {
				if (this.isJsonMode(flags)) this.output(result, flags);
				else if (!flags.quiet) this.logToStderr(gapsChangedMessage(result.dependencyReport));
				this.exit(EXIT_BLOCKED);
				return;
			}
			if (result.status === 'preview-changed') {
				// `succeed()` ignores --jq, so JSON output goes through `output()`.
				if (this.isJsonMode(flags)) this.output(result, flags);
				else if (!flags.quiet) {
					this.logToStderr(
						[
							'The Promote preview changed since you reviewed it. Nothing was pushed.',
							'Run list-changes again. Review the changes. Then promote with the new revision.',
						].join('\n'),
					);
				}
				this.exit(EXIT_SOURCE_CHANGED);
				return;
			}
			if (result.dependencyReport && !flags.quiet && !this.isJsonMode(flags)) {
				const lines = formatDependencyReport(result.dependencyReport);
				if (lines.length > 0) this.logToStderr(lines.join('\n'));
			}
			this.succeed(
				`Promoted selection to ${result.git.branchName} as commit ${result.git.commitSha}.`,
				flags,
				result,
			);
		});
	}
}
