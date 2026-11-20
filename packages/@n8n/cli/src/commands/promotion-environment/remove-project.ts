import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class PromotionEnvironmentRemoveProject extends BaseCommand {
	static override description = 'Unlink a project from a promotion environment';

	static override examples = [
		'<%= config.bin %> promotion-environment remove-project env-1 proj-abc',
	];

	static override args = {
		id: Args.string({ description: 'Environment ID', required: true }),
		projectId: Args.string({ description: 'Project ID', required: true }),
	};

	static override flags = { ...BaseCommand.baseFlags };

	async run() {
		const { args, flags } = await this.parse(PromotionEnvironmentRemoveProject);
		await this.execute(async () => {
			await this.getClient(flags).removeProjectFromPromotionEnvironment(args.id, args.projectId);
			this.succeed(
				`Project ${args.projectId} unlinked from promotion environment ${args.id}.`,
				flags,
				{ id: args.id, projectId: args.projectId, removed: true },
			);
		});
	}
}
