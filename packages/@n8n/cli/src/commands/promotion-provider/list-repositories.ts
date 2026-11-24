import { Args, Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class PromotionProviderListRepositories extends BaseCommand {
	static override description =
		'List the repositories that the token of a GitLab provider can access. Use remoteUrl as the remote of an environment.';

	static override examples = [
		'<%= config.bin %> promotion-provider list-repositories prov-1',
		'<%= config.bin %> promotion-provider list-repositories prov-1 --search=flows --limit=10',
	];

	static override args = { id: Args.string({ description: 'Provider ID', required: true }) };

	static override flags = {
		...BaseCommand.baseFlags,
		search: Flags.string({ description: 'Only repositories whose name or namespace matches' }),
		limit: Flags.integer({ description: 'Maximum number of results' }),
	};

	async run() {
		const { args, flags } = await this.parse(PromotionProviderListRepositories);
		await this.execute(async () => {
			const data = await this.getClient(flags).listPromotionProviderRepositories(
				args.id,
				flags.search,
				flags.limit,
			);
			this.output(data, flags, {
				columns: ['id', 'name', 'fullPath', 'remoteUrl', 'defaultBranch'],
			});
		});
	}
}
