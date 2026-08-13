import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class TagDelete extends BaseCommand {
	static override description = 'Delete a tag';

	static override examples = ['<%= config.bin %> tag delete 1'];

	static override args = {
		id: Args.string({ description: 'Tag ID', required: true }),
	};

	static override flags = { ...BaseCommand.baseFlags };

	async run(): Promise<void> {
		const { args, flags } = await this.parse(TagDelete);
		await this.execute(async () => {
			const client = this.getClient(flags);
			await client.deleteTag(args.id);
			this.succeed(`Tag ${args.id} deleted.`, flags, { id: args.id, deleted: true });
		});
	}
}
