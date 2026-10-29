import { Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class PromotionEnvironmentList extends BaseCommand {
	static override description = 'List promotion environments';

	static override examples = [
		'<%= config.bin %> promotion-environment list',
		'<%= config.bin %> promotion-environment list --scope=instance',
		'<%= config.bin %> promotion-environment list --scope=instance --direction=promote',
		'<%= config.bin %> promotion-environment list --provider=prov-1',
	];

	static override flags = {
		...BaseCommand.baseFlags,
		scope: Flags.string({
			description: 'Only environments of this scope',
			options: ['instance', 'projects'],
		}),
		direction: Flags.string({
			description: 'Only environments of this direction',
			options: ['apply', 'promote'],
		}),
		provider: Flags.string({
			description: 'Only environments that use this provider',
			aliases: ['provider-id'],
		}),
		limit: Flags.integer({ description: 'Maximum number of results' }),
	};

	async run() {
		const { flags } = await this.parse(PromotionEnvironmentList);
		await this.execute(async () => {
			const query: Record<string, string> = {};
			if (flags.scope) query.scope = flags.scope;
			if (flags.direction) query.direction = flags.direction;
			if (flags.provider) query.providerId = flags.provider;

			const data = await this.getClient(flags).listPromotionEnvironments(query, flags.limit);
			this.output(data, flags, {
				columns: ['id', 'name', 'scope', 'direction', 'remote.remoteUrl'],
			});
		});
	}
}
