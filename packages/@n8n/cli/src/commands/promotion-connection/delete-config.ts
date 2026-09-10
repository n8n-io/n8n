import { Args } from '@oclif/core';

import { directionArg, toDirection } from './direction';
import { BaseCommand } from '../../base-command';

export default class PromotionConnectionDeleteConfig extends BaseCommand {
	static override description =
		'Delete the configuration of one direction and its local checkout. Nothing in Git changes.';

	static override examples = ['<%= config.bin %> promotion-connection delete-config conn-1 apply'];

	static override args = {
		id: Args.string({ description: 'Connection ID', required: true }),
		direction: directionArg,
	};

	static override flags = { ...BaseCommand.baseFlags };

	async run() {
		const { args, flags } = await this.parse(PromotionConnectionDeleteConfig);
		const direction = toDirection(args.direction);
		await this.execute(async () => {
			await this.getClient(flags).deletePromotionConfig(args.id, direction);
			this.succeed(`Direction ${direction} removed from promotion connection ${args.id}.`, flags, {
				id: args.id,
				direction,
				deleted: true,
			});
		});
	}
}
