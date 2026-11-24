import { Args, Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class VariableUpdate extends BaseCommand {
	static override description = 'Update a variable';

	static override examples = [
		'<%= config.bin %> variable update var-1 --key=API_ENDPOINT --value=https://new-api.example.com',
	];

	static override args = {
		id: Args.string({ description: 'Variable ID', required: true }),
	};

	static override flags = {
		...BaseCommand.baseFlags,
		key: Flags.string({ description: 'Variable key', required: true }),
		value: Flags.string({ description: 'New variable value', required: true }),
	};

	async run(): Promise<void> {
		const { args, flags } = await this.parse(VariableUpdate);
		await this.execute(async () => {
			const client = this.getClient(flags);
			await client.updateVariable(args.id, flags.key, flags.value);
			this.succeed(`Variable ${args.id} updated.`, flags, {
				id: args.id,
				key: flags.key,
				value: flags.value,
			});
		});
	}
}
