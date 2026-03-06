import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { readFile } from 'fs/promises';
import { z } from 'zod';

import { OwnershipService } from '@/services/ownership.service';

import { ImportExportService } from '../../modules/import-export/import-export.service';
import { BaseCommand } from '../base-command';

const flagsSchema = z.object({
	input: z.string().describe('Path to .n8np package file'),
	projectId: z
		.string()
		.describe('Target project ID to import into (for standalone workflow/folder packages)')
		.optional(),
	dryRun: z.coerce.boolean().describe('Analyze the package without importing').default(false),
	mode: z
		.enum(['strict', 'auto', 'force'])
		.describe(
			'Import mode: strict (fail on unresolved), auto (try to resolve), force (skip unresolved)',
		)
		.default('auto'),
	force: z.coerce.boolean().describe('Shorthand for --mode=force').default(false),
	withCredentialStubs: z.coerce
		.boolean()
		.describe('Create empty credential stubs for credentials in the package')
		.default(false),
	withVariableValues: z.coerce
		.boolean()
		.describe('Import variable values from the package (default: true)')
		.default(true),
	overwriteVariableValues: z.coerce
		.boolean()
		.describe('Overwrite existing variable values with those from the package (default: false)')
		.default(false),
});

@Command({
	name: 'import:package',
	description: 'Import a .n8np package file',
	examples: [
		'--input=export.n8np',
		'--input=export.n8np --projectId=abc123',
		'--input=export.n8np --mode=force',
		'--input=export.n8np --force',
		'--input=export.n8np --dryRun',
		'--input=export.n8np --withCredentialStubs',
		'--input=export.n8np --withVariableValues=false',
		'--input=export.n8np --overwriteVariableValues',
	],
	flagsSchema,
})
export class ImportPackageCommand extends BaseCommand<z.infer<typeof flagsSchema>> {
	override async init() {
		await super.init();
		await this.initLicense();
	}

	async run() {
		const {
			input,
			projectId,
			mode: modeFlag,
			force,
			dryRun,
			withCredentialStubs,
			withVariableValues,
			overwriteVariableValues,
		} = this.flags;
		const mode = force ? 'force' : modeFlag;

		const buffer = await readFile(input);
		const service = Container.get(ImportExportService);

		// Analyze
		const analysis = await service.analyzePackage(buffer);

		this.logger.info('');
		this.logger.info(
			`  Package: n8n ${analysis.sourceN8nVersion}, exported ${analysis.exportedAt}`,
		);
		this.logger.info('');
		this.logger.info(
			`  Contents: ${analysis.summary.projects} projects, ${analysis.summary.workflows} workflows, ` +
				`${analysis.summary.credentials} credentials, ${analysis.summary.variables} variables, ` +
				`${analysis.summary.folders} folders, ${analysis.summary.dataTables} data tables`,
		);

		const { credentials, subWorkflows, nodeTypes, variables } = analysis.requirements;
		const hasRequirements =
			credentials.length || subWorkflows.length || nodeTypes.length || variables.length;

		if (hasRequirements) {
			this.logger.info('');
			this.logger.info('  Requirements:');
			this.logger.info('  These dependencies are referenced by workflows in the package');
			this.logger.info('  but not included in it. They must exist on the target instance');
			this.logger.info('  for workflows to run correctly.');
		}

		if (credentials.length) {
			this.logger.info('');
			this.logger.warn(`  Credentials (${credentials.length}):`);
			this.logger.info('');
			for (const c of credentials) {
				this.logger.warn(`    - "${c.name}" (type: ${c.type}, id: ${c.id})`);
				this.logger.info(`      Used by: ${c.usedByWorkflows.join(', ')}`);
				this.logger.info('');
			}
			this.logger.info(`  In auto mode, credentials are matched by name + type.`);
			this.logger.info(
				`  Use --createCredentialStubs to create empty placeholders for missing ones.`,
			);
		}

		if (subWorkflows.length) {
			this.logger.info('');
			this.logger.warn(`  Sub-workflows (${subWorkflows.length}):`);
			this.logger.info('');
			for (const sw of subWorkflows) {
				this.logger.warn(`    - id: ${sw.id}`);
				this.logger.info(`      Used by: ${sw.usedByWorkflows.join(', ')}`);
				this.logger.info('');
			}
			this.logger.info(`  These workflows must exist on the target instance (matched by ID).`);
		}

		if (variables.length) {
			this.logger.info('');
			this.logger.warn(`  Variables (${variables.length}):`);
			this.logger.info('');
			for (const v of variables) {
				this.logger.warn(`    - "${v.name}"`);
				this.logger.info(`      Used by: ${v.usedByWorkflows.join(', ')}`);
				this.logger.info('');
			}
			this.logger.info(
				`  These variables must exist on the target instance or be included in the package.`,
			);
		}

		if (nodeTypes.length) {
			this.logger.info('');
			this.logger.warn(`  Missing node types (${nodeTypes.length}):`);
			this.logger.info('');
			for (const nt of nodeTypes) {
				this.logger.warn(`    - ${nt.type} v${nt.typeVersion}`);
				this.logger.info(`      Used by: ${nt.usedByWorkflows.join(', ')}`);
				this.logger.info('');
			}
			this.logger.info(`  Install the required community nodes before importing.`);
		}

		if (!hasRequirements) {
			this.logger.info('');
			this.logger.info('  No external requirements — package is self-contained.');
		}

		this.logger.info('');

		if (dryRun) {
			this.logger.info('  Dry run complete — no changes made.');
			this.logger.info('');
			return;
		}

		// Import
		const user = await Container.get(OwnershipService).getInstanceOwner();
		this.logger.info(
			`  Importing with mode="${mode}"${projectId ? ` into project ${projectId}` : ''}...`,
		);
		this.logger.info('');
		const result = await service.importPackage(buffer, {
			user,
			targetProjectId: projectId,
			mode,
			createCredentialStubs: withCredentialStubs,
			withVariableValues,
			overwriteVariableValues,
		});

		for (const project of result.projects) {
			this.logger.info(`  Created project: ${project.name} (${project.id})`);
		}

		const imported = [
			result.workflows && `${result.workflows} workflow(s)`,
			result.folders && `${result.folders} folder(s)`,
			result.credentials && `${result.credentials} credential(s)`,
			result.variables && `${result.variables} variable(s)`,
			result.dataTables && `${result.dataTables} data table(s)`,
		].filter(Boolean);

		if (imported.length) {
			this.logger.info(`  Imported: ${imported.join(', ')}`);
		}

		this.logger.info('');
		this.logger.info('  Import complete.');
		this.logger.info('');
	}

	catch(error: Error) {
		this.logger.error('Error importing package:');
		this.logger.error(error.message);
	}
}
