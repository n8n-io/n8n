import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { UserError } from 'n8n-workflow';
import { z } from 'zod';

import { OwnershipService } from '@/services/ownership.service';

import { ImportExportService } from '../../modules/import-export/import-export.service';
import type { ExportRequest } from '../../modules/import-export/import-export.types';
import { BaseCommand } from '../base-command';

const csvList = z.string().transform((val) =>
	val
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean),
);

const flagsSchema = z.object({
	projectIds: csvList.describe('Comma-separated project IDs to export').optional(),
	workflowIds: csvList.describe('Comma-separated workflow IDs to export').optional(),
	folderIds: csvList.describe('Comma-separated folder IDs to export').optional(),
	output: z.string().describe('Output file path').default('export.n8np'),
	includeVariableValues: z.coerce
		.boolean()
		.describe('Include variable values in the package (default: true)')
		.default(true),
});

@Command({
	name: 'export:package',
	description: 'Export projects, workflows, or folders as a .n8np package file',
	examples: [
		'--projectIds=abc123',
		'--projectIds=abc123,def456 --output=backup.n8np',
		'--workflowIds=abc123',
		'--workflowIds=abc123,def456 --output=my-workflows.n8np',
		'--folderIds=abc123',
		'--folderIds=abc123,def456 --output=my-folders.n8np',
	],
	flagsSchema,
})
export class ExportPackageCommand extends BaseCommand<z.infer<typeof flagsSchema>> {
	override async init() {
		await super.init();
		await this.initLicense();
	}

	async run() {
		const { projectIds, workflowIds, folderIds, output, includeVariableValues } = this.flags;

		const provided = [projectIds, workflowIds, folderIds].filter(Boolean);
		if (provided.length === 0) {
			throw new UserError('Provide one of --projectIds, --workflowIds, or --folderIds.');
		}
		if (provided.length > 1) {
			throw new UserError(
				'Only one of --projectIds, --workflowIds, or --folderIds can be used at a time.',
			);
		}

		const user = await Container.get(OwnershipService).getInstanceOwner();
		const service = Container.get(ImportExportService);

		let request: ExportRequest;
		let label: string;

		if (projectIds) {
			request = { type: 'projects', user, projectIds, includeVariableValues };
			label = `${projectIds.length} project(s)`;
		} else if (workflowIds) {
			request = { type: 'workflows', user, workflowIds, includeVariableValues };
			label = `${workflowIds.length} workflow(s)`;
		} else {
			request = { type: 'folders', user, folderIds: folderIds!, includeVariableValues };
			label = `${folderIds!.length} folder(s)`;
		}

		this.logger.info(`Exporting ${label}...`);

		const stream = await service.exportPackage(request);
		await pipeline(stream, createWriteStream(output));

		this.logger.info(`Package written to ${output}`);
	}

	catch(error: Error) {
		this.logger.error('Error exporting package:');
		this.logger.error(error.message);
	}
}
