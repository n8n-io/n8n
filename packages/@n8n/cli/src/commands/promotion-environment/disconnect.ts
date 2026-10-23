import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class PromotionEnvironmentDisconnect extends BaseCommand {
	static override description =
		'Remove the local checkout of an environment. The environment and its credentials are kept.';

	static override examples = ['<%= config.bin %> promotion-environment disconnect env-1'];

	static override args = { id: Args.string({ description: 'Environment ID', required: true }) };

	static override flags = { ...BaseCommand.baseFlags };

	async run() {
		const { args, flags } = await this.parse(PromotionEnvironmentDisconnect);
		await this.execute(async () => {
			this.output(await this.getClient(flags).disconnectPromotionCheckout(args.id), flags);
		});
	}
}
