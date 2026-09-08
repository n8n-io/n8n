import { Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class VariableCreate extends BaseCommand {
	static override description = 'Create a variable';

	static override examples = [
		'<%= config.bin %> variable create --key=API_ENDPOINT --value=https://api.example.com',
	];

	static override flags = {
		...BaseCommand.baseFlags,
		key: Flags.string({ description: 'Variable key', required: true }),
		value: Flags.string({ description: 'Variable value', required: true }),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(VariableCreate);
		await this.execute(async () => {
			const client = this.getClient(flags);
			const data = await client.createVariable(flags.key, flags.value);
			this.output(data, flags);
		});
	}
}
