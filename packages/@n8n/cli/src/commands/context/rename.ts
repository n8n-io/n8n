import { Args, Command } from '@oclif/core';

import { renameContext } from '../../config';

export default class ContextRename extends Command {
	static override description = 'Rename a context';

	static override examples = ['<%= config.bin %> context rename old-name new-name'];

	static override args = {
		old: Args.string({ description: 'Current context name', required: true }),
		new: Args.string({ description: 'New context name', required: true }),
	};

	async run(): Promise<void> {
		const { args } = await this.parse(ContextRename);

		try {
			renameContext(args.old, args.new);
		} catch (error) {
			this.error(error instanceof Error ? error.message : String(error));
		}

		this.log(`Context "${args.old}" renamed to "${args.new}".`);
	}
}
