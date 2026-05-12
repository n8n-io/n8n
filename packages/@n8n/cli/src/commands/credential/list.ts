import { Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class CredentialList extends BaseCommand {
	static override description = 'List credentials';

	static override examples = [
		'<%= config.bin %> credential list',
		'<%= config.bin %> credential list --node-type slackApi',
		'<%= config.bin %> credential list --format=json',
	];

	static override flags = {
		...BaseCommand.baseFlags,
		limit: Flags.integer({ description: 'Maximum number of results' }),
		nodeType: Flags.string({
			description:
				'Filter to credentials of the given type (matched client-side against the `type` field, e.g. "slackApi")',
			aliases: ['node-type'],
		}),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(CredentialList);
		await this.execute(async () => {
			const client = this.getClient(flags);
			const all = await client.listCredentials({}, flags.limit);
			// The public `/credentials` endpoint has no server-side `type` filter,
			// so apply the filter client-side. This is fine for the CLI's typical
			// list sizes and matches what users expect from `--node-type`.
			const filtered = flags.nodeType ? all.filter((c) => c.type === flags.nodeType) : all;
			this.output(filtered, flags, { columns: ['id', 'name', 'type', 'createdAt'] });
		});
	}
}
