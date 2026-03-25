import { Args, Command } from '@oclif/core';

import { setCurrentContext, listContexts } from '../../config';

export default class ContextUse extends Command {
	static override description = 'Switch to a named context';

	static override examples = ['<%= config.bin %> context use production'];

	static override args = {
		name: Args.string({ description: 'Context name to switch to', required: true }),
	};

	async run(): Promise<void> {
		const { args } = await this.parse(ContextUse);

		const contexts = listContexts();
		const exists = contexts.some((c) => c.name === args.name);

		if (!exists) {
			const available = contexts.map((c) => c.name).join(', ');
			this.error(
				`Context "${args.name}" does not exist.${available ? ` Available: ${available}` : ''}`,
			);
		}

		setCurrentContext(args.name);
		this.log(`Switched to context "${args.name}".`);
	}
}
