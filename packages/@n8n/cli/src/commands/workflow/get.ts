import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class WorkflowGet extends BaseCommand {
	static override description = 'Get a workflow by ID';

	static override examples = [
		'<%= config.bin %> workflow get 1234',
		'<%= config.bin %> workflow get 1234 --format=json > workflow.json',
	];

	static override args = {
		id: Args.string({ description: 'Workflow ID', required: true }),
	};

	static override flags = { ...BaseCommand.baseFlags };

	async run(): Promise<void> {
		const { args, flags } = await this.parse(WorkflowGet);
		await this.execute(async () => {
			const client = this.getClient(flags);
			const data = await client.getWorkflow(args.id);
			this.output(data, flags);
		});
	}
}
