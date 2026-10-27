import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class CredentialSchema extends BaseCommand {
	static override description = 'Get the JSON schema for a credential type';

	static override examples = [
		'<%= config.bin %> credential schema notionApi',
		'<%= config.bin %> credential schema slackOAuth2Api --format=json',
	];

	static override args = {
		typeName: Args.string({ description: 'Credential type name', required: true }),
	};

	static override flags = { ...BaseCommand.baseFlags };

	async run(): Promise<void> {
		const { args, flags } = await this.parse(CredentialSchema);
		await this.execute(async () => {
			const client = this.getClient(flags);
			const data = await client.getCredentialSchema(args.typeName);
			this.output(data, flags);
		});
	}
}
