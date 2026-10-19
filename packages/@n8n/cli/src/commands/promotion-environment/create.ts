import { Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class PromotionEnvironmentCreate extends BaseCommand {
	static override description =
		'Create a promotion connection on an existing provider, from JSON. Leave out `configs` to start with no direction configured.';

	static override examples = [
		'echo \'{"name":"Production","scope":"instance","providerId":"prov-1","target":{"schemaVersion":1,"remoteUrl":"git@github.com:acme/flows.git"},"configs":{"promote":{"settings":{"schemaVersion":1,"baseBranchName":"main","createBranchOnPromotion":false}}}}\' | <%= config.bin %> promotion-environment create --stdin',
		'<%= config.bin %> promotion-environment create --file=connection.json',
	];

	static override flags = {
		...BaseCommand.baseFlags,
		file: Flags.string({ description: 'Path to connection JSON file' }),
		stdin: Flags.boolean({ description: 'Read connection JSON from stdin', default: false }),
	};

	async run() {
		const { flags } = await this.parse(PromotionEnvironmentCreate);
		await this.execute(async () => {
			const body = JSON.parse(this.readInput(flags)) as unknown;
			this.output(await this.getClient(flags).createPromotionConnection(body), flags);
		});
	}
}
