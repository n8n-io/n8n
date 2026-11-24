import { Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class TagList extends BaseCommand {
	static override description = 'List tags';

	static override examples = ['<%= config.bin %> tag list'];

	static override flags = {
		...BaseCommand.baseFlags,
		limit: Flags.integer({ description: 'Maximum number of results' }),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(TagList);
		await this.execute(async () => {
			const client = this.getClient(flags);
			const data = await client.listTags({}, flags.limit);
			this.output(data, flags, { columns: ['id', 'name', 'createdAt'] });
		});
	}
}
