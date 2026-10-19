import type { ImportResultDto } from '@n8n/api-types';
import { Flags } from '@oclif/core';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { toPackagesError } from './package-error';
import { BaseCommand } from '../../base-command';

export default class PackageImportSelection extends BaseCommand {
	static override description =
		'Import a chosen subset of workflows from an n8n project package (.n8np)';

	static override examples = [
		'<%= config.bin %> package import-selection --file=export.n8np --selected-project-id=<id> --selected-workflow-ids=<id1>,<id2>',
		'<%= config.bin %> package import-selection --file=export.n8np --selected-project-id=<id> --selected-workflow-ids=<id1> --deleted-workflow-ids=<id3>',
		'<%= config.bin %> package import-selection --file=export.n8np --selected-project-id=<id> --selected-workflow-ids=<id1> --conflict-policy=skip',
	];

	static override flags = {
		...BaseCommand.baseFlags,
		file: Flags.string({ description: 'Path to the .n8np project package file', required: true }),
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
				'Target workflow IDs to archive (comma-separated, or repeat the flag). Already absent or archived workflows are ignored.',
			multiple: true,
			delimiter: ',',
			aliases: ['deleted-workflow-ids'],
		}),
		conflictPolicy: Flags.option({
			description: 'What to do when a workflow already exists in the target project',
			options: ['new-version', 'fail', 'skip'] as const,
			default: 'new-version',
			aliases: ['conflict-policy'],
		})(),
		idPolicy: Flags.option({
			description:
				'IDs for newly created workflows. Only source is supported. New workflows use the package IDs. Matched workflows keep their destination IDs.',
			options: ['source'] as const,
			aliases: ['id-policy'],
		})(),
		overwriteDeletionPolicy: Flags.option({
			description:
				'How --deleted-workflow-ids removes each target workflow (default: archive). archive keeps it recoverable; hard-delete also drops the workflow and its execution history',
			options: ['archive', 'hard-delete'] as const,
			aliases: ['overwrite-deletion-policy'],
		})(),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(PackageImportSelection);

		if (!fs.existsSync(flags.file)) {
			this.error(`File not found: ${flags.file}`);
		}

		await this.execute(async () => {
			const buffer = fs.readFileSync(flags.file);
			const client = this.getClient(flags);
			let result: ImportResultDto;
			try {
				result = await client.importPackageSelection(
					{ buffer, filename: path.basename(flags.file) },
					{
						selectedProjectId: flags.selectedProjectId,
						selectedWorkflowIds: flags.selectedWorkflowIds ?? [],
						deletedWorkflowIds: flags.deletedWorkflowIds,
						conflictPolicy: flags.conflictPolicy,
						idPolicy: flags.idPolicy,
						overwriteDeletionPolicy: flags.overwriteDeletionPolicy,
					},
				);
			} catch (error) {
				throw toPackagesError(error);
			}
			this.output(result, flags);
		});
	}
}
