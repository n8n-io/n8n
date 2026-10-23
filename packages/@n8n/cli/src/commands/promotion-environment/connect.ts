import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class PromotionEnvironmentConnect extends BaseCommand {
	static override description =
		'Connect an environment on the instance. For Git, this clones the configured branch into local storage. Safe to run again, and connecting one environment does not make another ready.';

	static override examples = ['<%= config.bin %> promotion-environment connect env-1'];

	static override args = { id: Args.string({ description: 'Environment ID', required: true }) };

	static override flags = { ...BaseCommand.baseFlags };

	async run() {
		const { args, flags } = await this.parse(PromotionEnvironmentConnect);
		await this.execute(async () => {
			this.output(await this.getClient(flags).connectPromotionCheckout(args.id), flags);
		});
	}
}
