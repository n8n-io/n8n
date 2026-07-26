import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class CredentialDelete extends BaseCommand {
	static override description = 'Delete a credential';

	static override examples = ['<%= config.bin %> credential delete 42'];

	static override args = {
		id: Args.string({ description: 'Credential ID', required: true }),
	};

	static override flags = { ...BaseCommand.baseFlags };

	async run(): Promise<void> {
		const { args, flags } = await this.parse(CredentialDelete);
		await this.execute(async () => {
			const client = this.getClient(flags);
			await client.deleteCredential(args.id);
			this.succeed(`Credential ${args.id} deleted.`, flags, { id: args.id, deleted: true });
		});
	}
}
