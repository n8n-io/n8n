import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class PromotionEnvironmentDelete extends BaseCommand {
	static override description =
		'Delete a promotion environment with its project links and local checkout. Its provider is kept.';

	static override examples = ['<%= config.bin %> promotion-environment delete env-1'];

	static override args = { id: Args.string({ description: 'Environment ID', required: true }) };

	static override flags = { ...BaseCommand.baseFlags };

	async run() {
		const { args, flags } = await this.parse(PromotionEnvironmentDelete);
		await this.execute(async () => {
			await this.getClient(flags).deletePromotionEnvironment(args.id);
			this.succeed(`Promotion environment ${args.id} deleted.`, flags, {
				id: args.id,
				deleted: true,
			});
		});
	}
}
