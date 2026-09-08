import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class UserGet extends BaseCommand {
	static override description = 'Get a user by ID';

	static override examples = ['<%= config.bin %> user get user-123'];

	static override args = {
		id: Args.string({ description: 'User ID or email', required: true }),
	};

	static override flags = { ...BaseCommand.baseFlags };

	async run(): Promise<void> {
		const { args, flags } = await this.parse(UserGet);
		await this.execute(async () => {
			const client = this.getClient(flags);
			const data = await client.getUser(args.id);
			this.output(data, flags);
		});
	}
}
