import { Args, Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class DataTableAddRows extends BaseCommand {
	static override description = 'Add rows to a data table';

	static override examples = [
		'<%= config.bin %> data-table add-rows dt-abc --file=rows.json',
		'cat rows.json | <%= config.bin %> data-table add-rows dt-abc --stdin',
	];

	static override args = {
		tableId: Args.string({ description: 'Data table ID', required: true }),
	};

	static override flags = {
		...BaseCommand.baseFlags,
		file: Flags.string({ description: 'Path to JSON file with row data array' }),
		stdin: Flags.boolean({ description: 'Read row data JSON from stdin', default: false }),
	};

	async run(): Promise<void> {
		const { args, flags } = await this.parse(DataTableAddRows);
		await this.execute(async () => {
			const raw = this.readInput(flags);
			const rows = JSON.parse(raw) as unknown[];
			const client = this.getClient(flags);
			const data = await client.addDataTableRows(args.tableId, rows);
			this.output(data, flags);
		});
	}
}
