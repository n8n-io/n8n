import { Flags } from '@oclif/core';
import * as fs from 'node:fs';

import { toPackagesError } from './shared';
import { BaseCommand } from '../../base-command';
import type { ExportPackageFields } from '../../client';

export default class PackageExport extends BaseCommand {
	static override description = 'Export workflows, folders, or projects as an n8n package (.n8np)';

	static override examples = [
		'<%= config.bin %> package export --workflow-id=abc --output=export.n8np',
		'<%= config.bin %> package export -w abc -w def -o team.n8np',
		'<%= config.bin %> package export --folder-id=xyz -o folders.n8np',
		'<%= config.bin %> package export --project-id=abc -o project.n8np',
		'<%= config.bin %> package export -p abc -p def -o projects.n8np',
	];

	static override flags = {
		...BaseCommand.baseFlags,
		workflowId: Flags.string({
			char: 'w',
			description: 'Workflow ID to include (repeat for multiple)',
			multiple: true,
			aliases: ['workflow-id'],
		}),
		folderId: Flags.string({
			char: 'f',
			description: 'Folder ID to include with its nested folders (repeat for multiple)',
			multiple: true,
			aliases: ['folder-id'],
		}),
		projectId: Flags.string({
			char: 'p',
			description: 'Project ID to include (repeat for multiple)',
			multiple: true,
			aliases: ['project-id'],
		}),
		subworkflowBehaviour: Flags.string({
			description: 'Sub-workflow export mode: included-in-package or references-only',
			options: ['included-in-package', 'references-only'],
			aliases: ['subworkflow-behaviour'],
		}),
		externalSubworkflowBehaviour: Flags.string({
			description: 'How to handle project/folder sub-workflows outside the export boundary',
			options: ['block', 'include-top-level', 'references-only'],
			aliases: ['external-subworkflow-behaviour'],
		}),
		output: Flags.string({
			char: 'o',
			description: 'File to write the package to',
			default: 'export.n8np',
		}),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(PackageExport);
		const workflowIds = flags.workflowId ?? [];
		const folderIds = flags.folderId ?? [];
		const projectIds = flags.projectId ?? [];

		// A package is either loose workflows/folders or whole projects, not both.
		if (projectIds.length > 0 && (workflowIds.length > 0 || folderIds.length > 0)) {
			this.error('Provide either --workflow-id/--folder-id or --project-id, not both');
		}
		if (workflowIds.length === 0 && folderIds.length === 0 && projectIds.length === 0) {
			this.error('At least one --workflow-id, --folder-id, or --project-id is required');
		}

		await this.execute(async () => {
			const client = this.getClient(flags);
			const exportPackageFields: ExportPackageFields =
				projectIds.length > 0 ? { projectIds } : { workflowIds, folderIds };
			if (flags.subworkflowBehaviour) {
				exportPackageFields.subworkflowBehaviour = flags.subworkflowBehaviour;
			}
			if (flags.externalSubworkflowBehaviour) {
				exportPackageFields.externalSubworkflowBehaviour = flags.externalSubworkflowBehaviour;
			}

			let archive: Buffer;
			try {
				archive = await client.exportPackage(exportPackageFields);
			} catch (error) {
				throw toPackagesError(error);
			}
			fs.writeFileSync(flags.output, archive);

			if (projectIds.length > 0) {
				this.succeed(`Exported ${projectIds.length} project(s) to ${flags.output}`, flags, {
					output: flags.output,
					projectIds,
				});
				return;
			}

			this.succeed(
				`Exported ${workflowIds.length} workflow(s) and ${folderIds.length} folder(s) to ${flags.output}`,
				flags,
				{ output: flags.output, workflowIds, folderIds },
			);
		});
	}
}
