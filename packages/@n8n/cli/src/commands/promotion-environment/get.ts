import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class PromotionEnvironmentGet extends BaseCommand {
	static override description =
		'Get a promotion environment by ID, with its provider summary and the state of its local checkout';

	static override examples = ['<%= config.bin %> promotion-environment get env-1'];

	static override args = { id: Args.string({ description: 'Environment ID', required: true }) };

	static override flags = { ...BaseCommand.baseFlags };

	async run() {
		const { args, flags } = await this.parse(PromotionEnvironmentGet);
		await this.execute(async () => {
			this.output(await this.getClient(flags).getPromotionEnvironment(args.id), flags);
		});
	}
}
