import { Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class DataTableCreate extends BaseCommand {
	static override description = 'Create a data table';

	static override examples = [
		'<%= config.bin %> data-table create --name=Inventory --columns=\'[{"name":"item","type":"string"},{"name":"qty","type":"number"}]\'',
	];

	static override flags = {
		...BaseCommand.baseFlags,
		name: Flags.string({ description: 'Table name', required: true }),
		columns: Flags.string({
			description: 'Column definitions as JSON array (e.g. [{"name":"col","type":"string"}])',
			required: true,
		}),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(DataTableCreate);
		await this.execute(async () => {
			const client = this.getClient(flags);
			const columns = JSON.parse(flags.columns) as unknown;
			const data = await client.createDataTable({ name: flags.name, columns });
			this.output(data, flags);
		});
	}
}
