import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class WorkflowActivate extends BaseCommand {
	static override description = 'Activate (publish) a workflow';

	static override examples = ['<%= config.bin %> workflow activate 1234'];

	static override args = {
		id: Args.string({ description: 'Workflow ID', required: true }),
	};

	static override flags = { ...BaseCommand.baseFlags };

	async run(): Promise<void> {
		const { args, flags } = await this.parse(WorkflowActivate);
		await this.execute(async () => {
			const client = this.getClient(flags);
			const data = await client.activateWorkflow(args.id);
			this.output(data, flags);
		});
	}
}
