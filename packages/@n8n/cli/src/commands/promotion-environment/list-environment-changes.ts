import { Args } from '@oclif/core';

import { directionArg, toDirection } from './direction';
import { changedRows } from './list-changes';
import { BaseCommand } from '../../base-command';

export default class PromotionEnvironmentListEnvironmentChanges extends BaseCommand {
	static override description =
		'Preview what Promote or Apply changes across the projects of an environment, in one view. The table lists each changed resource with its ID and its project, so you can select it for promote-environment-selection or apply-environment-selection as <projectId>:<id>. It lists only the projects that you can read. SELECTABLE is true only in a project where you can run the operation. Use --json for the full preview: `projects` with `canOperate`, `blockers` for the projects with an open review, `check` for apply, and the revision for --expected-preview-revision.';

	static override examples = [
		'<%= config.bin %> promotion-environment list-environment-changes env-1 promote',
		'<%= config.bin %> promotion-environment list-environment-changes env-2 apply --json',
	];

	static override args = {
		environmentId: Args.string({ description: 'Promotion environment ID', required: true }),
		direction: directionArg,
	};

	static override flags = {
		...BaseCommand.baseFlags,
	};

	async run() {
		const { args, flags } = await this.parse(PromotionEnvironmentListEnvironmentChanges);
		await this.execute(async () => {
			const preview = await this.getClient(flags).listEnvironmentPromotionChanges(
				args.environmentId,
				toDirection(args.direction),
			);
			if (this.isJsonMode(flags)) {
				this.output(preview, flags);
				return;
			}
			if (preview.blockers?.length && !flags.quiet) {
				const names = new Map(preview.projects.map(({ id, name }) => [id, name]));
				this.logToStderr(
					[
						'The changes of these projects are in an open review, so none are listed for them:',
						...preview.blockers.map(
							({ projectId, reviewId }) =>
								`  ${names.get(projectId) ?? projectId} (${projectId}), review ${reviewId}`,
						),
					].join('\n'),
				);
			}
			const projectIds = new Map(
				preview.resources.map(({ key, projectId }) => [key, projectId] as const),
			);
			const rows = changedRows(preview).map((row, index) => ({
				...row,
				project: projectIds.get(changedKeys(preview)[index]),
			}));
			this.output(rows, flags, {
				columns: ['project', 'type', 'id', 'name', 'change', 'folder', 'usedBy', 'selectable'],
			});
		});
	}
}

/** The keys of the rows of `changedRows`, in the same order. */
function changedKeys({ resources }: { resources: Array<{ key: string; change: string }> }) {
	return resources.filter(({ change }) => change !== 'unchanged').map(({ key }) => key);
}
