import { Args, Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class DataTableUpsertRows extends BaseCommand {
	static override description = 'Upsert rows in a data table';

	static override examples = [
		'<%= config.bin %> data-table upsert-rows dt-abc --file=upsert.json',
		'cat upsert.json | <%= config.bin %> data-table upsert-rows dt-abc --stdin',
	];

	static override args = {
		tableId: Args.string({ description: 'Data table ID', required: true }),
	};

	static override flags = {
		...BaseCommand.baseFlags,
		file: Flags.string({
			description: 'Path to JSON file with {filter, data} object',
		}),
		stdin: Flags.boolean({
			description: 'Read {filter, data} JSON from stdin',
			default: false,
		}),
	};

	async run(): Promise<void> {
		const { args, flags } = await this.parse(DataTableUpsertRows);
		await this.execute(async () => {
			const raw = this.readInput(flags);
			const body = JSON.parse(raw) as { filter: unknown; data: unknown };
			const client = this.getClient(flags);
			const data = await client.upsertDataTableRows(args.tableId, body.filter, body.data);
			this.output(data, flags);
		});
	}
}
