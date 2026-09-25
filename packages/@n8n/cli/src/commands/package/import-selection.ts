import { Flags } from '@oclif/core';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { toPackagesError } from './package-error';
import { BaseCommand } from '../../base-command';

export default class PackageImportSelection extends BaseCommand {
	static override description =
		'Import a chosen subset of workflows from an n8n package (.n8np) into a project';

	static override examples = [
		'<%= config.bin %> package import-selection --file=export.n8np --selected-project-id=<id> --selected-workflow-ids=<id1>,<id2>',
		'<%= config.bin %> package import-selection --file=export.n8np --selected-project-id=<id> --selected-workflow-ids=<id1> --deleted-workflow-ids=<id3>',
		'<%= config.bin %> package import-selection --file=export.n8np --selected-project-id=<id> --selected-workflow-ids=<id1> --workflow-conflict-policy=skip',
	];

	static override flags = {
		...BaseCommand.baseFlags,
		file: Flags.string({ description: 'Path to the .n8np package file', required: true }),
		selectedProjectId: Flags.string({
			description: 'Source project ID the selection is scoped to',
			required: true,
			aliases: ['selected-project-id'],
		}),
		selectedWorkflowIds: Flags.string({
			description:
				'Source workflow IDs to import (comma-separated, or repeat the flag). Only these are imported',
			multiple: true,
			delimiter: ',',
			aliases: ['selected-workflow-ids'],
		}),
		deletedWorkflowIds: Flags.string({
			description:
				'Target workflow IDs to delete (comma-separated, or repeat the flag). Only these are removed',
			multiple: true,
			delimiter: ',',
			aliases: ['deleted-workflow-ids'],
		}),
		workflowConflictPolicy: Flags.string({
			description: 'What to do when a workflow already exists in the target project',
			options: ['new-version', 'fail', 'skip'],
			default: 'new-version',
			aliases: ['workflow-conflict-policy'],
		}),
		workflowIdPolicy: Flags.string({
			description: 'Whether imported workflows keep their source ID (source) or receive a new one',
			options: ['new', 'source'],
			aliases: ['workflow-id-policy'],
		}),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(PackageImportSelection);

		if (!fs.existsSync(flags.file)) {
			this.error(`File not found: ${flags.file}`);
		}

		await this.execute(async () => {
			const buffer = fs.readFileSync(flags.file);
			const client = this.getClient(flags);
			let result: Record<string, unknown>;
			try {
				result = await client.importPackageSelection(
					{ buffer, filename: path.basename(flags.file) },
					{
						selectedProjectId: flags.selectedProjectId,
						selectedWorkflowIds: flags.selectedWorkflowIds ?? [],
						deletedWorkflowIds: flags.deletedWorkflowIds,
						workflowConflictPolicy: flags.workflowConflictPolicy,
						workflowIdPolicy: flags.workflowIdPolicy,
					},
				);
			} catch (error) {
				throw toPackagesError(error);
			}
			this.output(result, flags);
		});
	}
}
