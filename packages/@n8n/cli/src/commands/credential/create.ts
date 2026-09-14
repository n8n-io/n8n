import { Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class CredentialCreate extends BaseCommand {
	static override description = 'Create a credential';

	static override examples = [
		'<%= config.bin %> credential create --type=notionApi --name=\'My Notion\' --data=\'{"apiKey":"..."}\'',
		"<%= config.bin %> credential create --type=notionApi --name='My Notion' --file=cred.json",
		"cat cred.json | <%= config.bin %> credential create --type=notionApi --name='My Notion' --stdin",
	];

	static override flags = {
		...BaseCommand.baseFlags,
		type: Flags.string({ description: 'Credential type name', required: true }),
		name: Flags.string({ description: 'Credential display name', required: true }),
		data: Flags.string({ description: 'Credential data as JSON string' }),
		file: Flags.string({ description: 'Path to JSON file with credential data' }),
		stdin: Flags.boolean({ description: 'Read credential data JSON from stdin', default: false }),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(CredentialCreate);
		await this.execute(async () => {
			let credData: unknown;
			if (flags.data) {
				credData = JSON.parse(flags.data);
			} else {
				const raw = this.readInput(flags);
				credData = JSON.parse(raw);
			}

			const client = this.getClient(flags);
			const data = await client.createCredential({
				type: flags.type,
				name: flags.name,
				data: credData,
			});
			this.output(data, flags);
		});
	}
}
