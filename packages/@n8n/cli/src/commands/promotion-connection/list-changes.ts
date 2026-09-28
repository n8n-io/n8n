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
			const result = await this.getClient(flags).listProjectPromotionChanges(
				args.projectId,
				toDirection(args.direction),
			);
			// JSON and jq consumers want the `commitSha` + `changes` wrapper; table
			// and id-only need the rows themselves, or the array serializes into one
			// cell (table) or yields nothing (no top-level `id`).
			if (this.isJsonMode(flags)) {
				this.output(result, flags);
			} else {
				this.output(result.changes, flags, {
					columns: ['id', 'name', 'type', 'status', 'version', 'updatedAt'],
				});
			}
		});
	}
}
