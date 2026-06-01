import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class DataTableGet extends BaseCommand {
	static override description = 'Get a data table by ID';

	static override examples = ['<%= config.bin %> data-table get dt-abc'];

	static override args = {
		id: Args.string({ description: 'Data table ID', required: true }),
	};

	static override flags = { ...BaseCommand.baseFlags };

	async run(): Promise<void> {
		const { args, flags } = await this.parse(DataTableGet);
		await this.execute(async () => {
			const client = this.getClient(flags);
			const data = await client.getDataTable(args.id);
			this.output(data, flags);
		});
	}
}
