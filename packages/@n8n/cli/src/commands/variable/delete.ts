import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class VariableDelete extends BaseCommand {
	static override description = 'Delete a variable';

	static override examples = ['<%= config.bin %> variable delete var-1'];

	static override args = {
		id: Args.string({ description: 'Variable ID', required: true }),
	};

	static override flags = { ...BaseCommand.baseFlags };

	async run(): Promise<void> {
		const { args, flags } = await this.parse(VariableDelete);
		await this.execute(async () => {
			const client = this.getClient(flags);
			await client.deleteVariable(args.id);
			this.succeed(`Variable ${args.id} deleted.`, flags, { id: args.id, deleted: true });
		});
	}
}
