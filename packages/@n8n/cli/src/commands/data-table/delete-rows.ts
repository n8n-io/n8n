import { Args, Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class DataTableDeleteRows extends BaseCommand {
	static override description = 'Delete rows from a data table';

	static override examples = [
		'<%= config.bin %> data-table delete-rows dt-abc --filter=\'{"type":"and","filters":[{"columnName":"status","condition":"eq","value":"archived"}]}\'',
	];

	static override args = {
		tableId: Args.string({ description: 'Data table ID', required: true }),
	};

	static override flags = {
		...BaseCommand.baseFlags,
		filter: Flags.string({
			description: 'Filter as JSON string (required)',
			required: true,
		}),
	};

	async run(): Promise<void> {
		const { args, flags } = await this.parse(DataTableDeleteRows);
		await this.execute(async () => {
			const client = this.getClient(flags);
			const data = await client.deleteDataTableRows(args.tableId, flags.filter);
			this.output(data, flags);
		});
	}
}
