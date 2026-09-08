import { Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class PromotionConnectionList extends BaseCommand {
	static override description = 'List promotion connections';

	static override examples = [
		'<%= config.bin %> promotion-connection list',
		'<%= config.bin %> promotion-connection list --scope=instance',
		'<%= config.bin %> promotion-connection list --provider=prov-1',
	];

	static override flags = {
		...BaseCommand.baseFlags,
		scope: Flags.string({
			description: 'Only connections of this scope',
			options: ['instance', 'projects'],
		}),
		provider: Flags.string({
			description: 'Only connections that use this provider',
			aliases: ['provider-id'],
		}),
		limit: Flags.integer({ description: 'Maximum number of results' }),
	};

	async run() {
		const { flags } = await this.parse(PromotionConnectionList);
		await this.execute(async () => {
			const query: Record<string, string> = {};
			if (flags.scope) query.scope = flags.scope;
			if (flags.provider) query.providerId = flags.provider;

			const data = await this.getClient(flags).listPromotionConnections(query, flags.limit);
			this.output(data, flags, { columns: ['id', 'name', 'scope', 'target.remoteUrl'] });
		});
	}
}
