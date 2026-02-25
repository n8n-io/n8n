import type { WorkflowHistory } from '@n8n/db';
import { WorkflowRepository, WorkflowHistoryRepository } from '@n8n/db';
import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import fs from 'fs';
import { UserError } from 'n8n-workflow';
import path from 'path';
import { z } from 'zod';

import { BaseCommand } from '../base-command';

import type { IWorkflowWithVersionMetadata } from '@/interfaces';

import '../../zod-alias-support';

const flagsSchema = z.object({
	all: z.boolean().describe('Export all workflows').optional(),
	backup: z
		.boolean()
		.describe(
			'Sets --all --pretty --separate for simple backups. Only --output has to be set additionally.',
		)
		.optional(),
	id: z.string().describe('The ID of the workflow to export').optional(),
	output: z
		.string()
		.alias('o')
		.describe('Output file name or directory if using separate files')
		.optional(),
	pretty: z.boolean().describe('Format the output in an easier to read fashion').optional(),
	separate: z
		.boolean()
		.describe(
			'Exports one file per workflow (useful for versioning). Must inform a directory via --output.',
		)
		.optional(),
	version: z.string().describe('The version ID to export').optional(),
	published: z.boolean().describe('Export the published/active version').optional(),
});

@Command({
	name: 'export:workflow',
	description: 'Export workflows',
	examples: [
		'--all',
		'--id=5 --output=file.json',
		'--id=5 --version=abc-123-def',
		'--id=5 --published',
		'--all --published --output=backups/latest/',
		'--all --output=backups/latest/',
		'--backup --output=backups/latest/',
	],
	flagsSchema,
})
export class ExportWorkflowsCommand extends BaseCommand<z.infer<typeof flagsSchema>> {
	// eslint-disable-next-line complexity
	async run() {
		const { flags } = this;

		if (flags.backup) {
			flags.all = true;
			flags.pretty = true;
			flags.separate = true;
		}

		if (flags.version && flags.published) {
			this.logger.info('Cannot use both --version and --published flags. Please specify one.');
			return;
		}

		if (flags.version && flags.all) {
			this.logger.info('--version flag cannot be used with --all flag.');
			return;
		}

		if (!flags.all && !flags.id) {
			this.logger.info('Either option "--all" or "--id" have to be set!');
			return;
		}

		if (flags.all && flags.id) {
			this.logger.info('You should either use "--all" or "--id" but never both!');
			return;
		}

		if (flags.separate) {
			try {
				if (!flags.output) {
					this.logger.info(
						'You must inform an output directory via --output when using --separate',
					);
					return;
				}

				if (fs.existsSync(flags.output)) {
					if (!fs.lstatSync(flags.output).isDirectory()) {
						this.logger.info('The parameter --output must be a directory');
						return;
					}
				} else {
					fs.mkdirSync(flags.output, { recursive: true });
				}
			} catch (e) {
				throw new UserError(
					`Filesystem error while creating the output directory: ${e instanceof Error ? e.message : String(e)}`,
				);
			}
		} else if (flags.output) {
			if (fs.existsSync(flags.output)) {
				if (fs.lstatSync(flags.output).isDirectory()) {
					this.logger.info('The parameter --output must be a writeable file');
					return;
				}
			}
		}

		const workflows = await Container.get(WorkflowRepository).find({
			where: flags.id ? { id: flags.id } : {},
			relations: ['tags', 'shared', 'shared.project'],
		});

		if (workflows.length === 0) {
			throw new UserError('No workflows found with specified filters');
		}

		const workflowsToExport = await getWorkflowsToExport(workflows, flags);

		if (flags.published && workflowsToExport.length === 0) {
			if (flags.id)
				throw new UserError(
					`No published version found for workflow "${workflows[0].name}" (${workflows[0].id})`,
				);
			else throw new UserError('No workflows with published versions found.');
		}
		if (flags.version && flags.id && workflowsToExport.length === 0) {
			throw new UserError(
				`Version "${flags.version}" not found for workflow "${workflows[0].name}" (${workflows[0].id})`,
			);
		}
		if (workflowsToExport.length === 0) {
			throw new UserError('No workflows found with specified filters');
		}

		if (flags.separate) {
			let fileContents: string;
			let i: number;
			for (i = 0; i < workflowsToExport.length; i++) {
				fileContents = JSON.stringify(workflowsToExport[i], null, flags.pretty ? 2 : undefined);
				const filename = `${
					(flags.output!.endsWith(path.sep) ? flags.output : flags.output + path.sep) +
					workflowsToExport[i].id
				}.json`;
				fs.writeFileSync(filename, fileContents);
			}
			this.logger.info(`Successfully exported ${i} workflows.`);
		} else {
			const fileContents = JSON.stringify(workflowsToExport, null, flags.pretty ? 2 : undefined);
			if (flags.output) {
				fs.writeFileSync(flags.output, fileContents);
				this.logger.info(
					`Successfully exported ${workflowsToExport.length} ${
						workflowsToExport.length === 1 ? 'workflow.' : 'workflows.'
					}`,
				);
			} else {
				this.logger.info(fileContents);
			}
		}
	}

	async catch(error: Error) {
		this.logger.error('Error exporting workflows. See log messages for details.');
		this.logger.debug(error.message);
	}
}

/**
 * For each workflow, determine the target version based on flags and fetch its history.
 * Then merge the history data into the workflow objects for export with metadata fields (name and description).
 */
async function getWorkflowsToExport(
	workflows: IWorkflowWithVersionMetadata[],
	flags: z.infer<typeof flagsSchema>,
) {
	const versionIdByWorkflow = new Map<string, string>();
	const workflowVersionPairs: Array<{ workflowId: string; versionId: string }> = [];

	for (const workflow of workflows) {
		const versionId = getTargetVersionId(workflow, flags);
		if (versionId) {
			versionIdByWorkflow.set(workflow.id, versionId);
			workflowVersionPairs.push({ workflowId: workflow.id, versionId });
		}
	}

	const workflowHistories: WorkflowHistory[] =
		workflowVersionPairs.length > 0
			? await Container.get(WorkflowHistoryRepository).find({
					where: workflowVersionPairs,
				})
			: [];

	const historyMap = new Map<string, WorkflowHistory>(
		workflowHistories.map((h) => [`${h.workflowId}:${h.versionId}`, h]),
	);

	return mergeHistoriesIntoWorkflows(workflows, versionIdByWorkflow, historyMap, flags);
}

function getTargetVersionId(
	workflow: IWorkflowWithVersionMetadata,
	flags: z.infer<typeof flagsSchema>,
): string | null {
	if (flags.published) return workflow.activeVersionId ?? null;
	if (flags.version) return flags.version;
	return workflow.versionId ?? null;
}

function mergeHistoriesIntoWorkflows(
	workflows: IWorkflowWithVersionMetadata[],
	versionIdByWorkflow: Map<string, string>,
	historyMap: Map<string, WorkflowHistory>,
	flags: z.infer<typeof flagsSchema>,
) {
	return workflows
		.map((workflow) => {
			const versionId = versionIdByWorkflow.get(workflow.id);
			if (!versionId) return null;

			const history = historyMap.get(`${workflow.id}:${versionId}`);

			if (!history && (flags.published || flags.version)) return null;

			if (history) {
				return {
					...workflow,
					nodes: history.nodes,
					connections: history.connections,
					versionId: history.versionId,
					versionMetadata: {
						name: history.name,
						description: history.description,
					},
				};
			}

			return {
				...workflow,
				versionMetadata: null,
			};
		})
		.filter((w) => w !== null);
}
