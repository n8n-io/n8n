import { Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class CredentialList extends BaseCommand {
	static override description = 'List credentials';

	static override examples = [
		'<%= config.bin %> credential list',
		'<%= config.bin %> credential list --format=json',
	];

	static override flags = {
		...BaseCommand.baseFlags,
		limit: Flags.integer({ description: 'Maximum number of results' }),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(CredentialList);
		await this.execute(async () => {
			const client = this.getClient(flags);
			const data = await client.listCredentials({}, flags.limit);
			this.output(data, flags, { columns: ['id', 'name', 'type', 'createdAt'] });
		});
	}
}
