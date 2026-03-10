import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import fs from 'fs';
import { UserError } from 'n8n-workflow';
import { z } from 'zod';

import { BaseCommand } from '../base-command';

import { WorkflowBuildService } from '@/services/workflow-build.service';

import '../../zod-alias-support';

const flagsSchema = z.object({
	input: z.string().alias('i').describe('Path to .ts file with workflow SDK code').optional(),
	id: z.string().describe('Workflow ID to update (omit to create new)').optional(),
	name: z.string().describe('Workflow name override').optional(),
	projectId: z.string().describe('Project ID to own the new workflow').optional(),
	strict: z.boolean().describe('Treat all warnings as errors').default(false),
	dryRun: z.boolean().describe('Validate only, do not save').default(false),
});

@Command({
	name: 'build:workflow',
	description: 'Create or update a workflow from TypeScript SDK code',
	examples: [
		'--input=workflow.ts',
		'--input=workflow.ts --name="My Workflow"',
		'--input=workflow.ts --id=abc123',
		'--input=workflow.ts --projectId=proj123',
		'--input=workflow.ts --dry-run',
		'--input=workflow.ts --strict',
	],
	flagsSchema,
})
export class BuildWorkflowCommand extends BaseCommand<z.infer<typeof flagsSchema>> {
	async run(): Promise<void> {
		const { flags } = this;

		if (!flags.input) {
			throw new UserError('--input is required. Provide a path to a .ts file.');
		}

		if (!fs.existsSync(flags.input)) {
			throw new UserError(`File not found: ${flags.input}`);
		}

		if (flags.projectId && flags.id) {
			throw new UserError('Cannot use --projectId with --id. Project is only for new workflows.');
		}

		const service = Container.get(WorkflowBuildService);

		// Initialize schema validation
		service.initSchemaValidation();

		// Parse and validate
		const result = await service.parseAndValidateFile(flags.input);

		// Apply name override
		if (flags.name) {
			result.workflow.name = flags.name;
		}

		// Partition warnings
		const { errors, informational } = flags.strict
			? { errors: result.warnings, informational: [] as typeof result.warnings }
			: service.partitionWarnings(result.warnings);

		// Print errors
		if (errors.length > 0) {
			this.logger.error('Validation errors:');
			for (const issue of errors) {
				const location = issue.nodeName ? ` (node: ${issue.nodeName})` : '';
				this.logger.error(`  [${issue.code}] ${issue.message}${location}`);
			}
			throw new UserError(`Workflow has ${errors.length} validation error(s).`);
		}

		// Print informational warnings
		if (informational.length > 0) {
			this.logger.warn('Warnings:');
			for (const w of informational) {
				const location = w.nodeName ? ` (node: ${w.nodeName})` : '';
				this.logger.warn(`  [${w.code}] ${w.message}${location}`);
			}
		}

		// Dry run — stop here
		if (flags.dryRun) {
			this.logger.info('Validation passed (dry run).');
			return;
		}

		// Ensure webhook IDs
		const json = await service.ensureWebhookIds(result.workflow, flags.id);

		// Create or update
		if (flags.id) {
			const updated = await service.updateWorkflow(flags.id, json);
			this.logger.info(`Workflow updated: ${updated.id}`);
		} else {
			const created = await service.createWorkflow(json, flags.projectId);
			this.logger.info(`Workflow created: ${created.id}`);
		}
	}

	async catch(error: Error) {
		this.logger.error('Error building workflow. See log messages for details.');
		this.logger.error(error.message);
	}
}
