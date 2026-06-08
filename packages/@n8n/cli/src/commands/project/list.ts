import { Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class ProjectList extends BaseCommand {
	static override description = 'List projects';

	static override examples = ['<%= config.bin %> project list'];

	static override flags = {
		...BaseCommand.baseFlags,
		limit: Flags.integer({ description: 'Maximum number of results' }),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(ProjectList);
		await this.execute(async () => {
			const client = this.getClient(flags);
			const data = await client.listProjects({}, flags.limit);
			this.output(data, flags, { columns: ['id', 'name', 'type', 'createdAt'] });
		});
	}
}
