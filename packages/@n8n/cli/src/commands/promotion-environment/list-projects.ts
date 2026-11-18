import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class PromotionEnvironmentListProjects extends BaseCommand {
	static override description = 'List the projects linked to a promotion environment';

	static override examples = ['<%= config.bin %> promotion-environment list-projects env-1'];

	static override args = { id: Args.string({ description: 'Environment ID', required: true }) };

	static override flags = { ...BaseCommand.baseFlags };

	async run() {
		const { args, flags } = await this.parse(PromotionEnvironmentListProjects);
		await this.execute(async () => {
			this.output(await this.getClient(flags).listPromotionEnvironmentProjects(args.id), flags);
		});
	}
}
