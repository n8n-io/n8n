import { Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class ProjectCreate extends BaseCommand {
	static override description = 'Create a project';

	static override examples = ['<%= config.bin %> project create --name="AI Workflows"'];

	static override flags = {
		...BaseCommand.baseFlags,
		name: Flags.string({ description: 'Project name', required: true }),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(ProjectCreate);
		await this.execute(async () => {
			const client = this.getClient(flags);
			const data = await client.createProject(flags.name);
			this.output(data, flags);
		});
	}
}
