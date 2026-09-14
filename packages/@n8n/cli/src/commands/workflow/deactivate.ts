import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class WorkflowDeactivate extends BaseCommand {
	static override description = 'Deactivate a workflow';

	static override examples = ['<%= config.bin %> workflow deactivate 1234'];

	static override args = {
		id: Args.string({ description: 'Workflow ID', required: true }),
	};

	static override flags = { ...BaseCommand.baseFlags };

	async run(): Promise<void> {
		const { args, flags } = await this.parse(WorkflowDeactivate);
		await this.execute(async () => {
			const client = this.getClient(flags);
			const data = await client.deactivateWorkflow(args.id);
			this.output(data, flags);
		});
	}
}
