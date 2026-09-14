import { Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class TagCreate extends BaseCommand {
	static override description = 'Create a tag';

	static override examples = ['<%= config.bin %> tag create --name=production'];

	static override flags = {
		...BaseCommand.baseFlags,
		name: Flags.string({ description: 'Tag name', required: true }),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(TagCreate);
		await this.execute(async () => {
			const client = this.getClient(flags);
			const data = await client.createTag(flags.name);
			this.output(data, flags);
		});
	}
}
