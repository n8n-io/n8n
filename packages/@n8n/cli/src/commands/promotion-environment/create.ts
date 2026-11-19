import { Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class PromotionEnvironmentCreate extends BaseCommand {
	static override description =
		'Create a promotion environment for one direction on an existing provider, from JSON. The settings must match the direction.';

	static override examples = [
		'echo \'{"name":"Production","scope":"instance","providerId":"prov-1","remote":{"schemaVersion":1,"remoteUrl":"git@github.com:acme/flows.git"},"direction":"promote","settings":{"schemaVersion":1,"baseBranchName":"main","createBranchOnPromotion":false}}\' | <%= config.bin %> promotion-environment create --stdin',
		'echo \'{"name":"Production","scope":"instance","providerId":"prov-1","remote":{"schemaVersion":1,"remoteUrl":"git@github.com:acme/flows.git"},"direction":"apply","settings":{"schemaVersion":1,"branchName":"main"}}\' | <%= config.bin %> promotion-environment create --stdin',
		'<%= config.bin %> promotion-environment create --file=environment.json',
	];

	static override flags = {
		...BaseCommand.baseFlags,
		file: Flags.string({ description: 'Path to environment JSON file' }),
		stdin: Flags.boolean({ description: 'Read environment JSON from stdin', default: false }),
	};

	async run() {
		const { flags } = await this.parse(PromotionEnvironmentCreate);
		await this.execute(async () => {
			const body = JSON.parse(this.readInput(flags)) as unknown;
			this.output(await this.getClient(flags).createPromotionEnvironment(body), flags);
		});
	}
}
