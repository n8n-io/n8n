import { Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class WorkflowList extends BaseCommand {
	static override description = 'List workflows';

	static override examples = [
		'<%= config.bin %> workflow list',
		'<%= config.bin %> workflow list --active',
		'<%= config.bin %> workflow list --tag=production --format=json',
	];

	static override flags = {
		...BaseCommand.baseFlags,
		active: Flags.boolean({ description: 'Only show active workflows' }),
		tag: Flags.string({ description: 'Filter by tag name', aliases: ['tags'] }),
		name: Flags.string({ description: 'Filter by workflow name' }),
		limit: Flags.integer({ description: 'Maximum number of results' }),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(WorkflowList);
		await this.execute(async () => {
			const client = this.getClient(flags);
			const query: Record<string, string> = {};
			if (flags.active) query.active = 'true';
			if (flags.tag) query.tags = flags.tag;
			if (flags.name) query.name = flags.name;

			const data = await client.listWorkflows(query, flags.limit);
			this.output(data, flags, { columns: ['id', 'name', 'active', 'updatedAt'] });
		});
	}
}
