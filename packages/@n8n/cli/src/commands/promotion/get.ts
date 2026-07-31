import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class PromotionGet extends BaseCommand {
	static override description = 'POC: Get a promotion, including its available actions';

	static override examples = ['<%= config.bin %> promotion get prom-abc'];

	static override args = {
		id: Args.string({ description: 'Promotion ID', required: true }),
	};

	static override flags = { ...BaseCommand.baseFlags };

	async run(): Promise<void> {
		const { args, flags } = await this.parse(PromotionGet);
		await this.execute(async () => {
			const client = this.getClient(flags);
			const data = await client.getPromotion(args.id);
			this.output(data, flags);
		});
	}
}
