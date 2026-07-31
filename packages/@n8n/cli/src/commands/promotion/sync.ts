import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class PromotionSync extends BaseCommand {
	static override description =
		'POC: Reconcile a promotion with its external state (peer instance, git remote)';

	static override examples = ['<%= config.bin %> promotion sync prom-abc'];

	static override args = {
		id: Args.string({ description: 'Promotion ID', required: true }),
	};

	static override flags = { ...BaseCommand.baseFlags };

	async run(): Promise<void> {
		const { args, flags } = await this.parse(PromotionSync);
		await this.execute(async () => {
			const client = this.getClient(flags);
			const data = await client.syncPromotion(args.id);
			this.output(data, flags, { columns: ['id', 'model', 'state'] });
		});
	}
}
