import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class WorkflowDelete extends BaseCommand {
	static override description = 'Delete a workflow';

	static override examples = ['<%= config.bin %> workflow delete 1234'];

	static override args = {
		id: Args.string({ description: 'Workflow ID', required: true }),
	};

	static override flags = { ...BaseCommand.baseFlags };

	async run(): Promise<void> {
		const { args, flags } = await this.parse(WorkflowDelete);
		await this.execute(async () => {
			const client = this.getClient(flags);
			await client.deleteWorkflow(args.id);
			this.succeed(`Workflow ${args.id} deleted.`, flags, { id: args.id, deleted: true });
		});
	}
}
