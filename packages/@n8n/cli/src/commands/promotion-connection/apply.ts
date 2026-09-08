import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class PromotionConnectionApply extends BaseCommand {
	static override description =
		'Reset the local checkout to the configured branch tip and import the package, overwriting the instance to match. Requires the Apply direction to be cloned first.';

	static override examples = ['<%= config.bin %> promotion-connection apply conn-1'];

	static override args = { id: Args.string({ description: 'Connection ID', required: true }) };

	static override flags = { ...BaseCommand.baseFlags };

	async run() {
		const { args, flags } = await this.parse(PromotionConnectionApply);
		await this.execute(async () => {
			const result = await this.getClient(flags).applyPackage(args.id);
			this.succeed(
				`Applied ${result.git.branchName} at commit ${result.git.commitSha} to the instance.`,
				flags,
				result,
			);
		});
	}
}
