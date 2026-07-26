import { Args, Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class ProjectMembers extends BaseCommand {
	static override description = 'List members of a project';

	static override examples = ['<%= config.bin %> project members proj-abc'];

	static override args = {
		id: Args.string({ description: 'Project ID', required: true }),
	};

	static override flags = {
		...BaseCommand.baseFlags,
		limit: Flags.integer({ description: 'Maximum number of results' }),
	};

	async run(): Promise<void> {
		const { args, flags } = await this.parse(ProjectMembers);
		await this.execute(async () => {
			const client = this.getClient(flags);
			const data = await client.listProjectMembers(args.id, flags.limit);
			this.output(data, flags, { columns: ['id', 'email', 'role'] });
		});
	}
}
