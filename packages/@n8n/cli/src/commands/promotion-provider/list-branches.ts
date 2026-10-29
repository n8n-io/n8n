import { Args, Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class PromotionProviderListBranches extends BaseCommand {
	static override description =
		'List the branches of a repository on a GitLab provider, with the default branch marked.';

	static override examples = [
		'<%= config.bin %> promotion-provider list-branches prov-1 acme/flows',
		'<%= config.bin %> promotion-provider list-branches prov-1 42 --search=release',
	];

	static override args = {
		id: Args.string({ description: 'Provider ID', required: true }),
		repository: Args.string({
			description:
				'Repository fullPath or id, as list-repositories prints it, or the remote.repositoryPath of an environment. Do not URL-encode it.',
			required: true,
		}),
	};

	static override flags = {
		...BaseCommand.baseFlags,
		search: Flags.string({ description: 'Only branches whose name matches' }),
		limit: Flags.integer({ description: 'Maximum number of results' }),
	};

	async run() {
		const { args, flags } = await this.parse(PromotionProviderListBranches);
		await this.execute(async () => {
			const data = await this.getClient(flags).listPromotionProviderBranches(
				args.id,
				args.repository,
				flags.search,
				flags.limit,
			);
			// Branches have no `id`. The name is what environment settings take.
			this.output(data, flags, { columns: ['name', 'isDefault'], idField: 'name' });
		});
	}
}
