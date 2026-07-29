import { Args, Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class ExecutionGet extends BaseCommand {
	static override description = 'Get execution details';

	static override examples = [
		'<%= config.bin %> execution get 5678',
		'<%= config.bin %> execution get 5678 --include-data --format=json',
	];

	static override args = {
		id: Args.string({ description: 'Execution ID', required: true }),
	};

	static override flags = {
		...BaseCommand.baseFlags,
		includeData: Flags.boolean({
			description: 'Include full node execution data',
			default: false,
			aliases: ['include-data'],
		}),
	};

	async run(): Promise<void> {
		const { args, flags } = await this.parse(ExecutionGet);
		await this.execute(async () => {
			const client = this.getClient(flags);
			const data = await client.getExecution(args.id, flags.includeData);
			this.output(data, flags);
		});
	}
}
