import { Args, Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class PromotionConnectionPromoteSelection extends BaseCommand {
	static override description =
		"Read a chosen set of a project's workflows now and push their current state to the instance connection's Promote branch. Archived or deleted ids leave the branch. Requires the Promote direction to be cloned first.";

	static override examples = [
		'<%= config.bin %> promotion-connection promote-selection proj-abc -w wf-1 -w wf-2',
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
	};

	async run() {
		const { args, flags } = await this.parse(PromotionConnectionPromoteSelection);
		await this.execute(async () => {
			const result = await this.getClient(flags).promoteProjectSelection(
				args.projectId,
				flags.workflow,
			);
			this.succeed(
				`Promoted ${result.counts.workflows} workflow(s) to ${result.git.branchName} as commit ${result.git.commitSha}.`,
				flags,
				result,
			);
		});
	}
}
