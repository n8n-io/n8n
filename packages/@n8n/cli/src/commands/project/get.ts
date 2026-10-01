import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class ProjectGet extends BaseCommand {
	static override description = 'Get a project by ID';

	static override examples = ['<%= config.bin %> project get proj-abc'];

	static override args = {
		id: Args.string({ description: 'Project ID', required: true }),
	};

	static override flags = { ...BaseCommand.baseFlags };

	async run(): Promise<void> {
		const { args, flags } = await this.parse(ProjectGet);
		await this.execute(async () => {
			const client = this.getClient(flags);
			const data = await client.getProject(args.id);
			this.output(data, flags);
		});
	}
}
