import { Args, Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class PromotionEnvironmentUpdate extends BaseCommand {
	static override description =
		'Update the name, provider, remote, or settings of a promotion environment, from JSON. Settings replace the whole saved settings and must match the direction. Direction and scope cannot change.';

	static override examples = [
		'echo \'{"name":"Production (EU)"}\' | <%= config.bin %> promotion-environment update env-1 --stdin',
		'echo \'{"settings":{"schemaVersion":1,"baseBranchName":"main","createBranchOnPromotion":true}}\' | <%= config.bin %> promotion-environment update env-1 --stdin',
		'<%= config.bin %> promotion-environment update env-1 --file=environment.json',
	];

	static override args = { id: Args.string({ description: 'Environment ID', required: true }) };

	static override flags = {
		...BaseCommand.baseFlags,
		file: Flags.string({ description: 'Path to environment JSON file' }),
		stdin: Flags.boolean({ description: 'Read environment JSON from stdin', default: false }),
	};

	async run() {
		const { args, flags } = await this.parse(PromotionEnvironmentUpdate);
		await this.execute(async () => {
			const body = JSON.parse(this.readInput(flags)) as unknown;
			this.output(await this.getClient(flags).updatePromotionEnvironment(args.id, body), flags);
		});
	}
}
