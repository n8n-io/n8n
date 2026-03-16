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
	strict: z.boolean().describe('Treat all warnings as errors').default(false),
	json: z.boolean().describe('Output as JSON').default(false),
});

@Command({
	name: 'validate:workflow',
	description: 'Validate TypeScript SDK workflow code',
	examples: ['--input=workflow.ts', '--input=workflow.ts --strict', '--input=workflow.ts --json'],
	flagsSchema,
})
export class ValidateWorkflowCommand extends BaseCommand<z.infer<typeof flagsSchema>> {
	async run(): Promise<void> {
		const { flags } = this;

		if (!flags.input) {
			throw new UserError('--input is required. Provide a path to a .ts file.');
		}

		if (!fs.existsSync(flags.input)) {
			throw new UserError(`File not found: ${flags.input}`);
		}

		const service = Container.get(WorkflowBuildService);

		// Initialize schema validation
		service.initSchemaValidation();

		// Parse and validate
		const result = await service.parseAndValidateFile(flags.input);

		// Partition warnings
		const { errors, informational } = flags.strict
			? { errors: result.warnings, informational: [] as typeof result.warnings }
			: service.partitionWarnings(result.warnings);

		if (flags.json) {
			this.log(
				JSON.stringify(
					{
						valid: errors.length === 0,
						errors,
						warnings: informational,
						workflowName: result.workflow.name,
						nodeCount: result.workflow.nodes.length,
					},
					null,
					2,
				),
			);
		} else {
			if (errors.length > 0) {
				this.logger.error('Validation errors:');
				for (const issue of errors) {
					const location = issue.nodeName ? ` (node: ${issue.nodeName})` : '';
					this.logger.error(`  [${issue.code}] ${issue.message}${location}`);
				}
			}

			if (informational.length > 0) {
				this.logger.warn('Warnings:');
				for (const w of informational) {
					const location = w.nodeName ? ` (node: ${w.nodeName})` : '';
					this.logger.warn(`  [${w.code}] ${w.message}${location}`);
				}
			}

			if (errors.length === 0) {
				this.logger.info(
					`Validation passed. Workflow "${result.workflow.name}" has ${result.workflow.nodes.length} node(s).`,
				);
			}
		}

		if (errors.length > 0) {
			throw new UserError(`Workflow has ${errors.length} validation error(s).`);
		}
	}

	async catch(error: Error) {
		this.logger.error('Error validating workflow. See log messages for details.');
		this.logger.error(error.message);
	}
}
