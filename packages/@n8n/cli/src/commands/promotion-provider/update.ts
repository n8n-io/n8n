import { Args, Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class PromotionProviderUpdate extends BaseCommand {
	static override description =
		'Update a promotion provider from JSON. Sending `auth` replaces the credentials of every connection that uses the provider.';

	static override examples = [
		'echo \'{"name":"GitHub (deploy)"}\' | <%= config.bin %> promotion-provider update prov-1 --stdin',
		'<%= config.bin %> promotion-provider update prov-1 --file=provider.json',
	];

	static override args = { id: Args.string({ description: 'Provider ID', required: true }) };

	static override flags = {
		...BaseCommand.baseFlags,
		file: Flags.string({ description: 'Path to provider JSON file' }),
		stdin: Flags.boolean({ description: 'Read provider JSON from stdin', default: false }),
	};

	async run() {
		const { args, flags } = await this.parse(PromotionProviderUpdate);
		await this.execute(async () => {
			const body = JSON.parse(this.readInput(flags)) as unknown;
			this.output(await this.getClient(flags).updatePromotionProvider(args.id, body), flags);
		});
	}
}
