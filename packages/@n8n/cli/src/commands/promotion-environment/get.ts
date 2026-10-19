import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class PromotionEnvironmentGet extends BaseCommand {
	static override description =
		'Get a promotion connection by ID, with its provider summary and its configurations';

	static override examples = ['<%= config.bin %> promotion-environment get conn-1'];

	static override args = { id: Args.string({ description: 'Connection ID', required: true }) };

	static override flags = { ...BaseCommand.baseFlags };

	async run() {
		const { args, flags } = await this.parse(PromotionEnvironmentGet);
		await this.execute(async () => {
			this.output(await this.getClient(flags).getPromotionConnection(args.id), flags);
		});
	}
}
