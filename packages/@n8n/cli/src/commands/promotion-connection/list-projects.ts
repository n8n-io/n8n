import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class PromotionConnectionListProjects extends BaseCommand {
	static override description = 'List the projects linked to a promotion connection';

	static override examples = ['<%= config.bin %> promotion-connection list-projects conn-1'];

	static override args = { id: Args.string({ description: 'Connection ID', required: true }) };

	static override flags = { ...BaseCommand.baseFlags };

	async run() {
		const { args, flags } = await this.parse(PromotionConnectionListProjects);
		await this.execute(async () => {
			this.output(await this.getClient(flags).listPromotionConnectionProjects(args.id), flags);
		});
	}
}
