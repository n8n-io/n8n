import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class ExecutionStop extends BaseCommand {
	static override description = 'Stop a running execution';

	static override examples = ['<%= config.bin %> execution stop 5678'];

	static override args = {
		id: Args.string({ description: 'Execution ID', required: true }),
	};

	static override flags = { ...BaseCommand.baseFlags };

	async run(): Promise<void> {
		const { args, flags } = await this.parse(ExecutionStop);
		await this.execute(async () => {
			const client = this.getClient(flags);
			const data = await client.stopExecution(args.id);
			this.output(data, flags);
		});
	}
}
