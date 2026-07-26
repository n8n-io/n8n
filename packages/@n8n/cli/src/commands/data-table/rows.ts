import { Args, Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class DataTableRows extends BaseCommand {
	static override description = 'List rows in a data table';

	static override examples = [
		'<%= config.bin %> data-table rows dt-abc',
		'<%= config.bin %> data-table rows dt-abc --search=keyword --limit=50',
	];

	static override args = {
		tableId: Args.string({ description: 'Data table ID', required: true }),
	};

	static override flags = {
		...BaseCommand.baseFlags,
		search: Flags.string({ description: 'Full-text search across string columns' }),
		filter: Flags.string({ description: 'Filter as JSON string' }),
		limit: Flags.integer({ description: 'Maximum number of results' }),
	};

	async run(): Promise<void> {
		const { args, flags } = await this.parse(DataTableRows);
		await this.execute(async () => {
			const client = this.getClient(flags);
			const query: Record<string, string> = {};
			if (flags.search) query.search = flags.search;
			if (flags.filter) query.filter = flags.filter;

			const data = await client.listDataTableRows(args.tableId, query, flags.limit);
			this.output(data, flags);
		});
	}
}
