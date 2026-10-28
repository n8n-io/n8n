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
function describeExport(counts: ExportPackageCounts): string {
	const parts: string[] = [];
	if (counts.projects) parts.push(`${counts.projects} project(s)`);
	if (counts.agents) parts.push(`${counts.agents} agent(s)`);
	if (counts.workflows) parts.push(`${counts.workflows} workflow(s)`);
	if (counts.folders) parts.push(`${counts.folders} folder(s)`);
	if (counts.credentials) parts.push(`${counts.credentials} credential(s)`);
	if (counts.dataTables) parts.push(`${counts.dataTables} data table(s)`);
	if (counts.variables) parts.push(`${counts.variables} variable(s)`);
	if (counts.tags) parts.push(`${counts.tags} tag(s)`);
	return parts.length > 0 ? parts.join(', ') : 'nothing';
}

export default class PackageExport extends BaseCommand {
	static override description =
		'Export Agents, workflows, folders, or projects as an n8n package (.n8np)';

	static override examples = [
		'<%= config.bin %> package export --agent-id=reviewer --agent-id=helper --dependency-policy=include-in-package -o agents.n8np',
		'<%= config.bin %> package export --agent-id=reviewer --workflow-id=tool -o mixed.n8np',
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
		agentId: Flags.string({
			description: 'Agent ID to include (repeat for multiple)',
			multiple: true,
			aliases: ['agent-id'],
		}),
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
		includeVariableValues: Flags.option({
			description:
				'Whether values of referenced variables are bundled into the package (the variables themselves always travel, value-less when false)',
			options: ['true', 'false'] as const,
			default: 'true',
			aliases: ['include-variable-values'],
		})(),
		includeTags: Flags.option({
			description: 'Whether tags assigned to the exported workflows are bundled into the package',
			options: ['true', 'false'] as const,
			default: 'true',
			aliases: ['include-tags'],
		})(),
		dependencyPolicy: Flags.option({
			options: ['fail', 'reference-only', 'include-in-package'] as const,
			default: 'fail',
			description:
				'How to handle workflow and agent dependencies outside the selected package contents',
			aliases: ['dependency-policy'],
		})(),
		versionPolicy: Flags.option({
			options: ['published-strict', 'prefer-published', 'ignore-unpublished', 'latest'] as const,
			default: 'latest',
			description: 'Which version of each workflow and agent to export',
			aliases: ['version-policy'],
		})(),
		// No default: the key is only sent when set, so older servers that reject unknown fields keep working.
		credentialExportPolicy: Flags.option({
			options: ['expression-values-only', 'no-values'] as const,
			description:
				'Whether expression values from credential data are bundled into the package; literal values never travel (default on the instance: expression-values-only)',
			aliases: ['credential-export-policy'],
		})(),
		includeArchivedWorkflows: Flags.option({
			description:
				'Whether folder and project exports include their archived workflows (workflows given by id always export)',
			options: ['true', 'false'] as const,
			default: 'false',
			aliases: ['include-archived-workflows'],
		})(),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(PackageExport);
		const agentIds = flags.agentId ?? [];
		const workflowIds = flags.workflowId ?? [];
		const folderIds = flags.folderId ?? [];
		const projectIds = flags.projectId ?? [];
		const includeVariableValues = flags.includeVariableValues !== 'false';
		const includeTags = flags.includeTags !== 'false';
		const dependencyPolicy = flags.dependencyPolicy;
		const versionPolicy = flags.versionPolicy;
		const credentialExportPolicy = flags.credentialExportPolicy;
		const includeArchivedWorkflows = flags.includeArchivedWorkflows === 'true';

		const hasLooseSelection = agentIds.length > 0 || workflowIds.length > 0 || folderIds.length > 0;
		if (projectIds.length > 0 && hasLooseSelection) {
			this.error('Provide either --agent-id/--workflow-id/--folder-id or --project-id, not both');
		}
		if (!hasLooseSelection && projectIds.length === 0) {
			this.error(
				'At least one --agent-id, --workflow-id, --folder-id, or --project-id is required',
			);
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
								dependencyPolicy,
								versionPolicy,
								credentialExportPolicy,
								...(includeArchivedWorkflows ? { includeArchivedWorkflows } : {}),
							}
						: {
								...(agentIds.length > 0 ? { agentIds } : {}),
								workflowIds,
								folderIds,
								includeVariableValues,
								includeTags,
								dependencyPolicy,
								versionPolicy,
								credentialExportPolicy,
								...(includeArchivedWorkflows ? { includeArchivedWorkflows } : {}),
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
			let summary = `${workflowIds.length} workflow(s) and ${folderIds.length} folder(s)`;
			if (agentIds.length > 0) summary = `${agentIds.length} agent(s), ${summary}`;
			if (counts) summary = describeExport({ ...counts, agents: counts.agents ?? agentIds.length });
			this.succeed(`Exported ${summary} to ${flags.output}`, flags, {
				output: flags.output,
				...(agentIds.length > 0 ? { agentIds } : {}),
				workflowIds,
				folderIds,
				...(counts ? { counts } : {}),
			});
		});
	}
}
