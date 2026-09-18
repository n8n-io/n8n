import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class PromotionProviderGet extends BaseCommand {
	static override description =
		'Get a promotion provider by ID, including the public key of an SSH provider';

	static override examples = ['<%= config.bin %> promotion-provider get prov-1'];

	static override args = { id: Args.string({ description: 'Provider ID', required: true }) };

	static override flags = { ...BaseCommand.baseFlags };

	async run() {
		const { args, flags } = await this.parse(PromotionProviderGet);
		await this.execute(async () => {
			this.output(await this.getClient(flags).getPromotionProvider(args.id), flags);
		});
	}
}
