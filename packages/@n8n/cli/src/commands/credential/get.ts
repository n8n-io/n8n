import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class CredentialGet extends BaseCommand {
	static override description = 'Get credential metadata (no secrets)';

	static override examples = ['<%= config.bin %> credential get 42'];

	static override args = {
		id: Args.string({ description: 'Credential ID', required: true }),
	};

	static override flags = { ...BaseCommand.baseFlags };

	async run(): Promise<void> {
		const { args, flags } = await this.parse(CredentialGet);
		await this.execute(async () => {
			const client = this.getClient(flags);
			const data = await client.getCredential(args.id);
			this.output(data, flags);
		});
	}
}
