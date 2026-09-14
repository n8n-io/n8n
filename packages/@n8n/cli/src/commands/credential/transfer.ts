import { Args, Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class CredentialTransfer extends BaseCommand {
	static override description = 'Transfer a credential to another project';

	static override examples = ['<%= config.bin %> credential transfer 42 --project=proj-abc'];

	static override args = {
		id: Args.string({ description: 'Credential ID', required: true }),
	};

	static override flags = {
		...BaseCommand.baseFlags,
		project: Flags.string({ description: 'Destination project ID', required: true }),
	};

	async run(): Promise<void> {
		const { args, flags } = await this.parse(CredentialTransfer);
		await this.execute(async () => {
			const client = this.getClient(flags);
			await client.transferCredential(args.id, flags.project);
			this.succeed(`Credential ${args.id} transferred to project ${flags.project}.`, flags, {
				id: args.id,
				transferredTo: flags.project,
			});
		});
	}
}
