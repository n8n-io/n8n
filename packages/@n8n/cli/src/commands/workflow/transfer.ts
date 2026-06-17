import { Args, Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class WorkflowTransfer extends BaseCommand {
	static override description = 'Transfer a workflow to another project';

	static override examples = ['<%= config.bin %> workflow transfer 1234 --project=proj-abc'];

	static override args = {
		id: Args.string({ description: 'Workflow ID', required: true }),
	};

	static override flags = {
		...BaseCommand.baseFlags,
		project: Flags.string({ description: 'Destination project ID', required: true }),
	};

	async run(): Promise<void> {
		const { args, flags } = await this.parse(WorkflowTransfer);
		await this.execute(async () => {
			const client = this.getClient(flags);
			await client.transferWorkflow(args.id, flags.project);
			this.succeed(`Workflow ${args.id} transferred to project ${flags.project}.`, flags, {
				id: args.id,
				transferredTo: flags.project,
			});
		});
	}
}
