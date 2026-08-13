import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class ProjectDelete extends BaseCommand {
	static override description = 'Delete a project';

	static override examples = ['<%= config.bin %> project delete proj-abc'];

	static override args = {
		id: Args.string({ description: 'Project ID', required: true }),
	};

	static override flags = { ...BaseCommand.baseFlags };

	async run(): Promise<void> {
		const { args, flags } = await this.parse(ProjectDelete);
		await this.execute(async () => {
			const client = this.getClient(flags);
			await client.deleteProject(args.id);
			this.succeed(`Project ${args.id} deleted.`, flags, { id: args.id, deleted: true });
		});
	}
}
