import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class PromotionProviderDelete extends BaseCommand {
	static override description = 'Delete a promotion provider. A provider in use cannot be deleted.';

	static override examples = ['<%= config.bin %> promotion-provider delete prov-1'];

	static override args = { id: Args.string({ description: 'Provider ID', required: true }) };

	static override flags = { ...BaseCommand.baseFlags };

	async run() {
		const { args, flags } = await this.parse(PromotionProviderDelete);
		await this.execute(async () => {
			await this.getClient(flags).deletePromotionProvider(args.id);
			this.succeed(`Promotion provider ${args.id} deleted.`, flags, {
				id: args.id,
				deleted: true,
			});
		});
	}
}
