import { Args, Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class NodeSearch extends BaseCommand {
	static override description =
		'Search the node catalog (hits the same endpoint as the MCP n8n_search_tools tool)';

	static override examples = [
		'<%= config.bin %> node search slack',
		'<%= config.bin %> node search "send message" --has-credential',
		'<%= config.bin %> node search slack --format=json',
	];

	static override args = {
		query: Args.string({ description: 'Search query', required: true }),
	};

	static override flags = {
		...BaseCommand.baseFlags,
		hasCredential: Flags.boolean({
			description: 'Only return nodes that require a credential',
			default: false,
			aliases: ['has-credential'],
		}),
	};

	async run(): Promise<void> {
		const { args, flags } = await this.parse(NodeSearch);
		await this.execute(async () => {
			const client = this.getClient(flags);
			const response = await client.searchNodes(args.query, flags.hasCredential || undefined);
			this.output(response.results, flags, {
				columns: ['nodeId', 'displayName', 'description'],
			});
		});
	}
}
