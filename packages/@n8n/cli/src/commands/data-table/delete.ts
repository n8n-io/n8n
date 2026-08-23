import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class DataTableDelete extends BaseCommand {
	static override description = 'Delete a data table';

	static override examples = ['<%= config.bin %> data-table delete dt-abc'];

	static override args = {
		id: Args.string({ description: 'Data table ID', required: true }),
	};

	static override flags = { ...BaseCommand.baseFlags };

	async run(): Promise<void> {
		const { args, flags } = await this.parse(DataTableDelete);
		await this.execute(async () => {
			const client = this.getClient(flags);
			await client.deleteDataTable(args.id);
			this.succeed(`Data table ${args.id} deleted.`, flags, { id: args.id, deleted: true });
		});
	}
}
