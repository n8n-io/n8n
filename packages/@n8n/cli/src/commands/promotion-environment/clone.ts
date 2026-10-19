import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class PromotionEnvironmentClone extends BaseCommand {
	static override description =
		'Clone the configured branch of an environment into local storage. Safe to run again, and cloning one environment does not make another ready.';

	static override examples = ['<%= config.bin %> promotion-environment clone env-1'];

	static override args = { id: Args.string({ description: 'Environment ID', required: true }) };

	static override flags = { ...BaseCommand.baseFlags };

	async run() {
		const { args, flags } = await this.parse(PromotionEnvironmentClone);
		await this.execute(async () => {
			this.output(await this.getClient(flags).clonePromotionCheckout(args.id), flags);
		});
	}
}
