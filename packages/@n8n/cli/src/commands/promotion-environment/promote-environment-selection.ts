import { Args, Flags } from '@oclif/core';

import { BaseCommand, EXIT_BLOCKED, EXIT_SOURCE_CHANGED } from '../../base-command';
import { environmentSelectionFlags, toEnvironmentSelection } from './environment-selection';
import { expectedPreviewRevisionFlag } from './expected-source';

export default class PromotionEnvironmentPromoteEnvironmentSelection extends BaseCommand {
	static override description =
		'Promote items of one or more projects to the branch of a Promote environment in one commit. When the environment creates a branch for each Promote, the command opens one review for all the projects. Name each item with its project, as <projectId>:<id>. The details of each listed project are always pushed. A credential comes with the selected workflows of its project; --credential adds a credential that no selected workflow of its project uses. The environment must cover each project, and you need the right to promote in each of them. The command fails when an open review already holds the changes of a project of the selection. With --expected-preview-revision, nothing is pushed when a project or the branch changed since that preview, and the command exits with code 3. When the dependency gaps differ from --confirm-gap, nothing is pushed and the command exits with code 4.';

	static override examples = [
		'<%= config.bin %> promotion-environment promote-environment-selection env-1 -w proj-a:wf-1 -w proj-b:wf-2',
		'<%= config.bin %> promotion-environment promote-environment-selection env-1 -w proj-a:wf-1 --credential proj-b:cred-1',
		'<%= config.bin %> promotion-environment promote-environment-selection env-1 -p proj-a -m "Promote project details"',
	];

	static override args = {
		environmentId: Args.string({ description: 'Promote environment ID', required: true }),
	};

	static override flags = {
		...BaseCommand.baseFlags,
		...environmentSelectionFlags('promote'),
		message: Flags.string({
			char: 'm',
			description: 'Commit message. If you omit it, the commit uses a generated message.',
		}),
		...expectedPreviewRevisionFlag,
		confirmGap: Flags.string({
			description:
				'ID of a dependency gap that you accept, from the report of the preview (repeat for more than one). Needs an environment that allows incomplete promotions.',
			aliases: ['confirm-gap'],
			multiple: true,
		}),
	};

	async run() {
		const { args, flags } = await this.parse(PromotionEnvironmentPromoteEnvironmentSelection);
		const projects = toEnvironmentSelection(flags);
		await this.execute(async () => {
			const result = await this.getClient(flags).promoteEnvironmentSelection(args.environmentId, {
				projects,
				commitMessage: flags.message,
				expectedPreviewRevision: flags.expectedPreviewRevision,
				confirmedGapIds: flags.confirmGap,
			});
			if (result.status === 'promoted') {
				this.succeed(
					`Promoted the selection of ${projects.length} project(s) to ${result.git.branchName} as commit ${result.git.commitSha}.`,
					flags,
					result,
				);
				return;
			}
			// `succeed()` ignores --jq, so JSON output goes through `output()`.
			if (this.isJsonMode(flags)) this.output(result, flags);
			else if (!flags.quiet) {
				this.logToStderr(
					result.status === 'preview-changed'
						? [
								'The Promote preview changed since you reviewed it. Nothing was pushed.',
								'Run list-environment-changes again. Review the changes. Then promote with the new revision.',
							].join('\n')
						: [
								'The dependency gaps differ from the gaps that you confirmed. Nothing was pushed.',
								'Run with --json for the report. Close the gaps, or pass each gap ID to --confirm-gap.',
							].join('\n'),
				);
			}
			this.exit(result.status === 'preview-changed' ? EXIT_SOURCE_CHANGED : EXIT_BLOCKED);
		});
	}
}
