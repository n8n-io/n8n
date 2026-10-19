import { Args } from '@oclif/core';

import { directionArg, toDirection } from './direction';
import { BaseCommand } from '../../base-command';

export default class PromotionEnvironmentDisconnect extends BaseCommand {
	static override description =
		'Remove the local checkout of one direction. The configuration and its credentials are kept.';

	static override examples = ['<%= config.bin %> promotion-environment disconnect conn-1 promote'];

	static override args = {
		id: Args.string({ description: 'Connection ID', required: true }),
		direction: directionArg,
	};

	static override flags = { ...BaseCommand.baseFlags };

	async run() {
		const { args, flags } = await this.parse(PromotionEnvironmentDisconnect);
		const direction = toDirection(args.direction);
		await this.execute(async () => {
			const checkout = await this.getClient(flags).disconnectPromotionCheckout(args.id, direction);
			this.output(checkout, flags);
		});
	}
}
