import { Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class PromotionProviderCreate extends BaseCommand {
	static override description =
		'Create a promotion provider from JSON. An SSH provider returns the generated public key; add it to the remote as a deploy key.';

	static override examples = [
		'echo \'{"name":"GitHub","type":"git","auth":{"authType":"ssh-key","keyType":"ed25519"}}\' | <%= config.bin %> promotion-provider create --stdin',
		'<%= config.bin %> promotion-provider create --file=provider.json',
	];

	static override flags = {
		...BaseCommand.baseFlags,
		file: Flags.string({ description: 'Path to provider JSON file' }),
		stdin: Flags.boolean({ description: 'Read provider JSON from stdin', default: false }),
	};

	async run() {
		const { flags } = await this.parse(PromotionProviderCreate);
		await this.execute(async () => {
			const body = JSON.parse(this.readInput(flags)) as unknown;
			const { provider, publicKey } = await this.getClient(flags).createPromotionProvider(body);
			// Lift the provider to the top level so --format=id-only and --jq '.id' find its ID.
			this.output({ ...provider, publicKey }, flags);
		});
	}
}
