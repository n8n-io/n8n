import { Args, Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class PromotionEnvironmentPromoteSelection extends BaseCommand {
	static override description =
		"Read a chosen set of a project's workflows now and push their current state to the branch of the project's Promote environment, or of the instance Promote environment. Archived workflows stay on the branch as archived. A selected workflow that was deleted or moved to another project leaves this project's branch. The request fails before any write if the branch does not hold that workflow under this project. Requires that environment to be connected first.";

	static override examples = [
		'<%= config.bin %> promotion-environment promote-selection proj-abc -w wf-1 -w wf-2',
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
			required: true,
		}),
		message: Flags.string({
			char: 'm',
			description: 'Commit message. A default is used when omitted.',
		}),
	};

	async run() {
		const { args, flags } = await this.parse(PromotionEnvironmentPromoteSelection);
		await this.execute(async () => {
			const result = await this.getClient(flags).promoteProjectSelection(
				args.projectId,
				flags.workflow,
				flags.message,
			);
			this.succeed(
				`Promoted selection to ${result.git.branchName} as commit ${result.git.commitSha}.`,
				flags,
				result,
			);
		});
	}
}
