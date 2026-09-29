import { Args, Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class PromotionConnectionUpdate extends BaseCommand {
	static override description =
		'Update the name, target, or provider of a promotion connection, from JSON. Configurations have their own commands.';

	static override examples = [
		'echo \'{"name":"Production (EU)"}\' | <%= config.bin %> promotion-connection update conn-1 --stdin',
		'<%= config.bin %> promotion-connection update conn-1 --file=connection.json',
	];

	static override args = { id: Args.string({ description: 'Connection ID', required: true }) };

	static override flags = {
		...BaseCommand.baseFlags,
		file: Flags.string({ description: 'Path to connection JSON file' }),
		stdin: Flags.boolean({ description: 'Read connection JSON from stdin', default: false }),
	};

	async run() {
		const { args, flags } = await this.parse(PromotionConnectionUpdate);
		await this.execute(async () => {
			const body = JSON.parse(this.readInput(flags)) as unknown;
			this.output(await this.getClient(flags).updatePromotionConnection(args.id, body), flags);
		});
	}
}
