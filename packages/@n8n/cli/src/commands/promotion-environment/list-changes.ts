import { Args } from '@oclif/core';

import { directionArg, toDirection } from './direction';
import { BaseCommand } from '../../base-command';
import type { PromotionPreview } from '../../client';

/** The table cuts long cells, so it names a few workflows and counts the rest. */
const MAX_LISTED_WORKFLOWS = 3;

export default class PromotionEnvironmentListChanges extends BaseCommand {
	static override description =
		'Preview what Promote or Apply changes in a project: its projects, folders, workflows, credentials, data tables, variables and tags. The table lists each changed resource with its ID, so you can select it. Select workflows with --workflow and folders with --folder. Credentials, data tables and variables come with the workflows in USEDBY. Use --json for the full preview, including the revision for --expected-preview-revision.';

	static override examples = [
		'<%= config.bin %> promotion-environment list-changes proj-abc promote',
		'<%= config.bin %> promotion-environment list-changes proj-abc apply --json',
	];

	static override args = {
		projectId: Args.string({ description: 'Project ID', required: true }),
		direction: directionArg,
	};

	static override flags = {
		...BaseCommand.baseFlags,
	};

	async run() {
		const { args, flags } = await this.parse(PromotionEnvironmentListChanges);
		await this.execute(async () => {
			const preview = await this.getClient(flags).listProjectPromotionChanges(
				args.projectId,
				toDirection(args.direction),
			);
			if (this.isJsonMode(flags)) {
				this.output(preview, flags);
				return;
			}
			if (preview.blocker && !flags.quiet) {
				this.logToStderr(
					`An open review holds the changes of this project, so none are listed. Review: ${preview.blocker.reviewId}`,
				);
			}
			this.output(changedRows(preview), flags, {
				columns: ['type', 'id', 'name', 'change', 'folder', 'usedBy', 'selectable'],
			});
		});
	}
}

/** One row for each changed resource. Unchanged resources only give context, so they stay in --json. */
export function changedRows({ resources, dependencies }: PromotionPreview) {
	const byKey = new Map(resources.map((resource) => [resource.key, resource]));
	// Until credentials, data tables and variables can be selected (LIGO-1390), users send them by
	// selecting a workflow that carries them. Remove the column when they become selectable.
	const usedBy = new Map<string, string[]>();
	for (const { workflowKey, resourceKey, included } of dependencies) {
		const workflow = byKey.get(workflowKey);
		if (!included || !workflow) continue;
		usedBy.set(resourceKey, [...(usedBy.get(resourceKey) ?? []), workflow.id]);
	}
	return resources
		.filter(({ change }) => change !== 'unchanged')
		.map(({ key, type, id, name, change, parentKey, selectable }) => {
			const parent = parentKey === null ? undefined : byKey.get(parentKey);
			return {
				type,
				id,
				name,
				change,
				folder: parent?.type === 'folder' ? parent.name : undefined,
				usedBy: listIds(usedBy.get(key) ?? []),
				selectable,
			};
		});
}

function listIds(ids: string[]): string | undefined {
	if (ids.length === 0) return undefined;
	const listed = ids.slice(0, MAX_LISTED_WORKFLOWS).join(', ');
	const more = ids.length - MAX_LISTED_WORKFLOWS;
	return more > 0 ? `${listed} (+${more} more)` : listed;
}
