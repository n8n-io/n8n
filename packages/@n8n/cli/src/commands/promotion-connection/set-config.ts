import { Args, Flags } from '@oclif/core';

import { directionArg, toDirection } from './direction';
import { BaseCommand } from '../../base-command';

export default class PromotionConnectionSetConfig extends BaseCommand {
	static override description =
		'Create the configuration of one direction, or replace it, from JSON. The write replaces the whole configuration, so send every setting you want to keep. An omitted name resets it to the direction label.';

	static override examples = [
		'echo \'{"settings":{"schemaVersion":1,"branchName":"main"}}\' | <%= config.bin %> promotion-connection set-config conn-1 apply --stdin',
		'echo \'{"settings":{"schemaVersion":1,"baseBranchName":"main","createBranchOnPromotion":false}}\' | <%= config.bin %> promotion-connection set-config conn-1 promote --stdin',
		'<%= config.bin %> promotion-connection set-config conn-1 promote --file=promote-config.json',
	];

	static override args = {
		id: Args.string({ description: 'Connection ID', required: true }),
		direction: directionArg,
	};

	static override flags = {
		...BaseCommand.baseFlags,
		file: Flags.string({ description: 'Path to configuration JSON file' }),
		stdin: Flags.boolean({ description: 'Read configuration JSON from stdin', default: false }),
	};

	async run() {
		const { args, flags } = await this.parse(PromotionConnectionSetConfig);
		const direction = toDirection(args.direction);
		await this.execute(async () => {
			const body = JSON.parse(this.readInput(flags)) as unknown;
			const config = await this.getClient(flags).setPromotionConfig(args.id, direction, body);
			this.output(config, flags);
		});
	}
}
