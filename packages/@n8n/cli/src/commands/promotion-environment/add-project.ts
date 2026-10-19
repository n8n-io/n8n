import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class PromotionEnvironmentAddProject extends BaseCommand {
	static override description =
		'Link a team project to a project-scoped promotion connection. A project can be linked to one connection only.';

	static override examples = [
		'<%= config.bin %> promotion-environment add-project conn-1 proj-abc',
	];

	static override args = {
		id: Args.string({ description: 'Connection ID', required: true }),
		projectId: Args.string({ description: 'Project ID', required: true }),
	};

	static override flags = { ...BaseCommand.baseFlags };

	async run() {
		const { args, flags } = await this.parse(PromotionEnvironmentAddProject);
		await this.execute(async () => {
			const link = await this.getClient(flags).addProjectToPromotionConnection(
				args.id,
				args.projectId,
			);
			this.output(link, flags);
		});
	}
}
