import { Command } from '@n8n/decorators';
import { z } from 'zod';

import { BaseCommand } from './base-command';

const flagsSchema = z.object({
	workflow: z.string().describe('Path to a workflow JSON file or directory of workflow JSON files'),
	credentials: z.string().describe('Path to a credentials JSON file').optional(),
	port: z.coerce
		.number()
		.int()
		.positive()
		.default(5678)
		.describe('Port to bind the webhook listener on'),
	host: z.string().default('127.0.0.1').describe('Host to bind the webhook listener on'),
	logLevel: z
		.enum(['silent', 'error', 'warn', 'info', 'debug'])
		.default('info')
		.describe('Log level'),
});

@Command({
	name: 'headless',
	description:
		'Run a workflow ephemerally — import a workflow JSON file (or directory), activate it, then run once or stay alive depending on its triggers',
	examples: [
		'--workflow workflow.json',
		'--workflow workflow.json --credentials credentials.json',
		'--workflow ./workflows/',
		'--workflow workflow.json --port 8080',
	],
	flagsSchema,
})
export class Headless extends BaseCommand<z.infer<typeof flagsSchema>> {
	override needsCommunityPackages = false;

	override needsTaskRunner = true;

	async run() {
		this.logger.info('headless: skeleton ok');
	}
}
