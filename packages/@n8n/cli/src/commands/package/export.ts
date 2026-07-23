import { Flags } from '@oclif/core';
import * as fs from 'node:fs';

import { toPackagesError } from './shared';
import { BaseCommand } from '../../base-command';

export default class PackageExport extends BaseCommand {
	static override description = 'Export workflows, folders, or projects as an n8n package (.n8np)';

	static override examples = [
		'<%= config.bin %> package export --workflow-id=abc --output=export.n8np',
		'<%= config.bin %> package export -w abc -w def -o team.n8np',
		'<%= config.bin %> package export --folder-id=xyz -o folders.n8np',
		'<%= config.bin %> package export --project-id=abc -o project.n8np',
		'<%= config.bin %> package export -p abc -p def -o projects.n8np',
		'<%= config.bin %> package export -w abc --include-variable-values=false -o export.n8np',
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
		output: Flags.string({
			char: 'o',
			description: 'File to write the package to',
			default: 'export.n8np',
		}),
		// String enum instead of Flags.boolean so `--include-variable-values=false` works (oclif booleans only support --no-*).
		includeVariableValues: Flags.string({
			description:
				'Whether values of referenced variables are bundled into the package (the variables themselves always travel, value-less when false)',
			options: ['true', 'false'],
			default: 'true',
			aliases: ['include-variable-values'],
		}),
		missingWorkflowDependencyPolicy: Flags.string({
			options: ['fail', 'reference-only', 'include-in-package'],
			default: 'fail',
			description:
				'What to do when a dependency workflow (sub-workflow) is not explicitly included in the package target',
			aliases: ['missing-workflow-dependency-policy'],
		}),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(PackageExport);
		const workflowIds = flags.workflowId ?? [];
		const folderIds = flags.folderId ?? [];
		const projectIds = flags.projectId ?? [];
		const includeVariableValues = flags.includeVariableValues !== 'false';
		const missingWorkflowDependencyPolicy = flags.missingWorkflowDependencyPolicy;

		// A package is either loose workflows/folders or whole projects, not both.
		if (projectIds.length > 0 && (workflowIds.length > 0 || folderIds.length > 0)) {
			this.error('Provide either --workflow-id/--folder-id or --project-id, not both');
		}
		if (workflowIds.length === 0 && folderIds.length === 0 && projectIds.length === 0) {
			this.error('At least one --workflow-id, --folder-id, or --project-id is required');
		}

		await this.execute(async () => {
			const client = this.getClient(flags);
			let archive: Buffer;
			try {
				archive = await client.exportPackage(
					projectIds.length > 0
						? { projectIds, includeVariableValues, missingWorkflowDependencyPolicy }
						: { workflowIds, folderIds, includeVariableValues, missingWorkflowDependencyPolicy },
				);
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
