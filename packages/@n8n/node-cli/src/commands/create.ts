import { Command, Flags } from '@oclif/core';

export default class Create extends Command {
	static override description = 'Create a new n8n community node';
	static override examples = ['<%= config.bin %> <%= command.id %>'];
	static override flags = {
		// flag with no value (-f, --force)
		force: Flags.boolean({ char: 'f' }),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(Create);

		const force = flags.force;
		this.log(`hello from commands/create.ts (force=${force})`);
	}
}
