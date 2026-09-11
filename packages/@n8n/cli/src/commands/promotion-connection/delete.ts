import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class PromotionConnectionDelete extends BaseCommand {
	static override description =
		'Delete a promotion connection with its configurations, project links, and local checkouts. Its provider is kept.';

	static override examples = ['<%= config.bin %> promotion-connection delete conn-1'];

	static override args = { id: Args.string({ description: 'Connection ID', required: true }) };

	static override flags = { ...BaseCommand.baseFlags };

	async run() {
		const { args, flags } = await this.parse(PromotionConnectionDelete);
		await this.execute(async () => {
			await this.getClient(flags).deletePromotionConnection(args.id);
			this.succeed(`Promotion connection ${args.id} deleted.`, flags, {
				id: args.id,
				deleted: true,
			});
		});
	}
}
