import { Flags } from '@oclif/core';
import * as fs from 'node:fs';

import { toPackagesError } from './package-error';
import { BaseCommand } from '../../base-command';
import type { ExportPackageCounts, ExportPackageResult } from '../../client';

/**
 * Human-readable summary of an export, built from the real per-entity counts.
 * Categories with a zero count are omitted so a workflow-only export never
 * appends a spurious "0 folder(s)" and a folder export reports its bundled
 * workflows.
 */
function describeExport(counts: ExportPackageCounts & { projects?: number }): string {
	const parts: string[] = [];
	if (counts.projects) parts.push(`${counts.projects} project(s)`);
	if (counts.workflows) parts.push(`${counts.workflows} workflow(s)`);
	if (counts.folders) parts.push(`${counts.folders} folder(s)`);
	if (counts.credentials) parts.push(`${counts.credentials} credential(s)`);
	if (counts.dataTables) parts.push(`${counts.dataTables} data table(s)`);
	if (counts.variables) parts.push(`${counts.variables} variable(s)`);
	if (counts.tags) parts.push(`${counts.tags} tag(s)`);
	return parts.length > 0 ? parts.join(', ') : 'nothing';
}

export default class PackageExport extends BaseCommand {
	static override description = 'Export workflows, folders, or projects as an n8n package (.n8np)';

	static override examples = [
		'<%= config.bin %> package export --workflow-id=abc --output=export.n8np',
		'<%= config.bin %> package export -w abc -w def -o team.n8np',
		'<%= config.bin %> package export --folder-id=xyz -o folders.n8np',
		'<%= config.bin %> package export --project-id=abc -o project.n8np',
		'<%= config.bin %> package export -p abc -p def -o projects.n8np',
		'<%= config.bin %> package export -w abc --include-variable-values=false -o export.n8np',
		'<%= config.bin %> package export -w abc --include-tags=false -o export.n8np',
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
		includeTags: Flags.string({
			description: 'Whether tags assigned to the exported workflows are bundled into the package',
			options: ['true', 'false'],
			default: 'true',
			aliases: ['include-tags'],
		}),
		missingWorkflowDependencyPolicy: Flags.string({
			options: ['fail', 'reference-only', 'include-in-package'],
			default: 'fail',
			description:
				'What to do when a dependency workflow (sub-workflow) is not explicitly included in the package target',
			aliases: ['missing-workflow-dependency-policy'],
		}),
		workflowVersionPolicy: Flags.string({
			options: ['published-strict', 'prefer-published', 'ignore-unpublished', 'latest'],
			default: 'latest',
			description: 'Which version of each workflow travels in the package',
			aliases: ['workflow-version-policy'],
		}),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(PackageExport);
		const workflowIds = flags.workflowId ?? [];
		const folderIds = flags.folderId ?? [];
		const projectIds = flags.projectId ?? [];
		const includeVariableValues = flags.includeVariableValues !== 'false';
		const includeTags = flags.includeTags !== 'false';
		const missingWorkflowDependencyPolicy = flags.missingWorkflowDependencyPolicy;
		const workflowVersionPolicy = flags.workflowVersionPolicy;

		// A package is either loose workflows/folders or whole projects, not both.
		if (projectIds.length > 0 && (workflowIds.length > 0 || folderIds.length > 0)) {
			this.error('Provide either --workflow-id/--folder-id or --project-id, not both');
		}
		if (workflowIds.length === 0 && folderIds.length === 0 && projectIds.length === 0) {
			this.error('At least one --workflow-id, --folder-id, or --project-id is required');
		}

		await this.execute(async () => {
			const client = this.getClient(flags);
			let result: ExportPackageResult;
			try {
				result = await client.exportPackage(
					projectIds.length > 0
						? {
								projectIds,
								includeVariableValues,
								includeTags,
								missingWorkflowDependencyPolicy,
								workflowVersionPolicy,
							}
						: {
								workflowIds,
								folderIds,
								includeVariableValues,
								includeTags,
								missingWorkflowDependencyPolicy,
								workflowVersionPolicy,
							},
				);
			} catch (error) {
				throw toPackagesError(error);
			}
			fs.writeFileSync(flags.output, result.archive);

			const { counts } = result;

			if (projectIds.length > 0) {
				// Older servers omit counts; fall back to the requested project id count.
				const summary = counts
					? describeExport({ ...counts, projects: projectIds.length })
					: `${projectIds.length} project(s)`;
				this.succeed(`Exported ${summary} to ${flags.output}`, flags, {
					output: flags.output,
					projectIds,
					...(counts ? { counts } : {}),
				});
				return;
			}

			// Older servers omit counts; fall back to the requested id counts.
			const summary = counts
				? describeExport(counts)
				: `${workflowIds.length} workflow(s) and ${folderIds.length} folder(s)`;
			this.succeed(`Exported ${summary} to ${flags.output}`, flags, {
				output: flags.output,
				workflowIds,
				folderIds,
				...(counts ? { counts } : {}),
			});
		});
	}
}
