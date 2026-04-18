import { Args, Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class TagUpdate extends BaseCommand {
	static override description = 'Update a tag';

	static override examples = ['<%= config.bin %> tag update 1 --name=staging'];

	static override args = {
		id: Args.string({ description: 'Tag ID', required: true }),
	};

	static override flags = {
		...BaseCommand.baseFlags,
		name: Flags.string({ description: 'New tag name', required: true }),
	};

	async run(): Promise<void> {
		const { args, flags } = await this.parse(TagUpdate);
		await this.execute(async () => {
			const client = this.getClient(flags);
			const data = await client.updateTag(args.id, flags.name);
			this.output(data, flags);
		});
	}
}
