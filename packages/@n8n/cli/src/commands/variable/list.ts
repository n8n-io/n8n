import { Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class VariableList extends BaseCommand {
	static override description = 'List variables';

	static override examples = ['<%= config.bin %> variable list'];

	static override flags = {
		...BaseCommand.baseFlags,
		limit: Flags.integer({ description: 'Maximum number of results' }),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(VariableList);
		await this.execute(async () => {
			const client = this.getClient(flags);
			const data = await client.listVariables({}, flags.limit);
			this.output(data, flags, { columns: ['id', 'key', 'value'] });
		});
	}
}
