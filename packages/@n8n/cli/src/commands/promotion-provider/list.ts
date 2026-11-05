import { Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class PromotionProviderList extends BaseCommand {
	static override description = 'List promotion providers';

	static override examples = ['<%= config.bin %> promotion-provider list'];

	static override flags = {
		...BaseCommand.baseFlags,
		limit: Flags.integer({ description: 'Maximum number of results' }),
	};

	async run() {
		const { flags } = await this.parse(PromotionProviderList);
		await this.execute(async () => {
			const data = await this.getClient(flags).listPromotionProviders(flags.limit);
			this.output(data, flags, { columns: ['id', 'name', 'type', 'authType', 'createdAt'] });
		});
	}
}
