import { Args } from '@oclif/core';

import { changedRows } from './list-changes';
import { BaseCommand } from '../../base-command';

export default class PromotionEnvironmentListApplyChanges extends BaseCommand {
	static override description =
		'Preview what Apply changes on the whole instance: its projects, folders, workflows, credentials, data tables, variables and tags. The table lists each changed resource with its project. A team project that the package does not hold is listed as deleted, together with everything in it. Use --json for the full preview, including the check and the revision for --expected-preview-revision. Requires a connected Apply environment with instance scope.';

	static override examples = [
		'<%= config.bin %> promotion-environment list-apply-changes env-1',
		'<%= config.bin %> promotion-environment list-apply-changes env-1 --json',
	];

	static override args = { id: Args.string({ description: 'Environment ID', required: true }) };

	static override flags = {
		...BaseCommand.baseFlags,
	};

	async run() {
		const { args, flags } = await this.parse(PromotionEnvironmentListApplyChanges);
		await this.execute(async () => {
			const preview = await this.getClient(flags).listInstanceApplyChanges(args.id);
			if (this.isJsonMode(flags)) {
				this.output(preview, flags);
				return;
			}
			// A whole-instance Apply takes every change, so no row is selectable.
			this.output(changedRows(preview), flags, {
				columns: ['type', 'id', 'name', 'project', 'change', 'folder', 'usedBy'],
			});
		});
	}
}
