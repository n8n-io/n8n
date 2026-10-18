import { Args, Flags } from '@oclif/core';

import { directionArg, toDirection } from './direction';
import { BaseCommand } from '../../base-command';
import type { PromotionChangesQuery } from '../../client';

const SORT_FIELDS: ReadonlyArray<NonNullable<PromotionChangesQuery['sort']>> = [
	'name',
	'updatedAt',
	'status',
];
const SORT_ORDERS: ReadonlyArray<NonNullable<PromotionChangesQuery['order']>> = ['asc', 'desc'];

export default class PromotionConnectionListChanges extends BaseCommand {
	static override description =
		"List the workflows that differ between a project and its promotion configuration's branch, in one direction.";

	static override examples = [
		'<%= config.bin %> promotion-connection list-changes proj-abc promote',
		'<%= config.bin %> promotion-connection list-changes proj-abc apply --sort=updatedAt --order=desc',
	];

	static override args = {
		projectId: Args.string({ description: 'Project ID', required: true }),
		direction: directionArg,
	};

	static override flags = {
		...BaseCommand.baseFlags,
		search: Flags.string({ description: 'Only list workflows whose name matches this text' }),
		sort: Flags.string({
			description: 'Field to sort by (server default: name)',
			options: [...SORT_FIELDS],
		}),
		order: Flags.string({
			description: 'Sort order (server default: asc)',
			options: [...SORT_ORDERS],
		}),
	};

	async run() {
		const { args, flags } = await this.parse(PromotionConnectionListChanges);
		await this.execute(async () => {
			const result = await this.getClient(flags).listProjectPromotionChanges(
				args.projectId,
				toDirection(args.direction),
				{
					search: flags.search,
					sort: SORT_FIELDS.find((field) => field === flags.sort),
					order: SORT_ORDERS.find((order) => order === flags.order),
				},
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
