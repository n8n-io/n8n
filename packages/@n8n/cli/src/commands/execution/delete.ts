import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class ExecutionDelete extends BaseCommand {
	static override description = 'Delete an execution';

	static override examples = ['<%= config.bin %> execution delete 5678'];

	static override args = {
		id: Args.string({ description: 'Execution ID', required: true }),
	};

	static override flags = { ...BaseCommand.baseFlags };

	async run(): Promise<void> {
		const { args, flags } = await this.parse(ExecutionDelete);
		await this.execute(async () => {
			const client = this.getClient(flags);
			await client.deleteExecution(args.id);
			this.succeed(`Execution ${args.id} deleted.`, flags, { id: args.id, deleted: true });
		});
	}
}
