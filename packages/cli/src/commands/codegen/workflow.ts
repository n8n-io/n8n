import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import fs from 'fs';
import { UserError } from 'n8n-workflow';
import { z } from 'zod';

import { BaseCommand } from '../base-command';

import { WorkflowBuildService } from '@/services/workflow-build.service';

import '../../zod-alias-support';

const flagsSchema = z.object({
	id: z.string().describe('Workflow ID to export as TypeScript code').optional(),
	output: z.string().alias('o').describe('Output file path (omit for stdout)').optional(),
});

@Command({
	name: 'codegen:workflow',
	description: 'Export an existing workflow as TypeScript SDK code',
	examples: ['--id=abc123', '--id=abc123 --output=workflow.ts'],
	flagsSchema,
})
export class CodegenWorkflowCommand extends BaseCommand<z.infer<typeof flagsSchema>> {
	async run(): Promise<void> {
		const { flags } = this;

		if (!flags.id) {
			throw new UserError('--id is required. Provide the workflow ID to export.');
		}

		const service = Container.get(WorkflowBuildService);
		const code = await service.exportToCode(flags.id);

		if (flags.output) {
			fs.writeFileSync(flags.output, code, 'utf-8');
			this.logger.info(`Workflow exported to ${flags.output}`);
		} else {
			this.log(code);
		}
	}

	async catch(error: Error) {
		this.logger.error('Error exporting workflow. See log messages for details.');
		this.logger.error(error.message);
	}
}
