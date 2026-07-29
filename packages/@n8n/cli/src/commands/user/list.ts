import { Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class UserList extends BaseCommand {
	static override description = 'List users';

	static override examples = ['<%= config.bin %> user list'];

	static override flags = {
		...BaseCommand.baseFlags,
		limit: Flags.integer({ description: 'Maximum number of results' }),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(UserList);
		await this.execute(async () => {
			const client = this.getClient(flags);
			const data = await client.listUsers({}, flags.limit);
			this.output(data, flags, { columns: ['id', 'email', 'firstName', 'lastName'] });
		});
	}
}
