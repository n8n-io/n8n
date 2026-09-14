import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class ExecutionRetry extends BaseCommand {
	static override description = 'Retry a failed execution';

	static override examples = ['<%= config.bin %> execution retry 5678'];

	static override args = {
		id: Args.string({ description: 'Execution ID', required: true }),
	};

	static override flags = { ...BaseCommand.baseFlags };

	async run(): Promise<void> {
		const { args, flags } = await this.parse(ExecutionRetry);
		await this.execute(async () => {
			const client = this.getClient(flags);
			const data = await client.retryExecution(args.id);
			this.output(data, flags);
		});
	}
}
