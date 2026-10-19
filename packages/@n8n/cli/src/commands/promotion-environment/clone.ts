import { Args } from '@oclif/core';

import { directionArg, toDirection } from './direction';
import { BaseCommand } from '../../base-command';

export default class PromotionEnvironmentClone extends BaseCommand {
	static override description =
		'Clone the configured branch of one direction into local storage. Safe to run again, and cloning one direction does not make the other ready.';

	static override examples = ['<%= config.bin %> promotion-environment clone conn-1 promote'];

	static override args = {
		id: Args.string({ description: 'Connection ID', required: true }),
		direction: directionArg,
	};

	static override flags = { ...BaseCommand.baseFlags };

	async run() {
		const { args, flags } = await this.parse(PromotionEnvironmentClone);
		const direction = toDirection(args.direction);
		await this.execute(async () => {
			const checkout = await this.getClient(flags).clonePromotionCheckout(args.id, direction);
			this.output(checkout, flags);
		});
	}
}
