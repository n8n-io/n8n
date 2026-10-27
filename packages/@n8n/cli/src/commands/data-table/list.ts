import { Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class DataTableList extends BaseCommand {
	static override description = 'List data tables';

	static override examples = ['<%= config.bin %> data-table list'];

	static override flags = {
		...BaseCommand.baseFlags,
		limit: Flags.integer({ description: 'Maximum number of results' }),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(DataTableList);
		await this.execute(async () => {
			const client = this.getClient(flags);
			const data = await client.listDataTables({}, flags.limit);
			this.output(data, flags, { columns: ['id', 'name', 'createdAt'] });
		});
	}
}
