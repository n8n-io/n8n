import { Args } from '@oclif/core';

import { directionArg, toDirection } from './direction';
import { BaseCommand } from '../../base-command';

export default class PromotionConnectionListChanges extends BaseCommand {
	static override description =
		"List the workflows that differ between a project and its promotion configuration's branch, in one direction.";

	static override examples = [
		'<%= config.bin %> promotion-connection list-changes proj-abc promote',
	];

	static override args = {
		projectId: Args.string({ description: 'Project ID', required: true }),
		direction: directionArg,
	};

	static override flags = { ...BaseCommand.baseFlags };

	async run() {
		const { args, flags } = await this.parse(PromotionConnectionListChanges);
		await this.execute(async () => {
			this.output(
				await this.getClient(flags).listProjectPromotionChanges(
					args.projectId,
					toDirection(args.direction),
				),
				flags,
			);
		});
	}
}
