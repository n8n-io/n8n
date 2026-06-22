import { Args, Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class ProjectUpdate extends BaseCommand {
	static override description = 'Update a project';

	static override examples = ['<%= config.bin %> project update proj-abc --name="New Name"'];

	static override args = {
		id: Args.string({ description: 'Project ID', required: true }),
	};

	static override flags = {
		...BaseCommand.baseFlags,
		name: Flags.string({ description: 'New project name', required: true }),
	};

	async run(): Promise<void> {
		const { args, flags } = await this.parse(ProjectUpdate);
		await this.execute(async () => {
			const client = this.getClient(flags);
			await client.updateProject(args.id, flags.name);
			this.succeed(`Project ${args.id} updated.`, flags, { id: args.id, name: flags.name });
		});
	}
}
