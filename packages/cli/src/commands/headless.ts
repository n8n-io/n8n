import { Command } from '@n8n/decorators';
import { UserError } from 'n8n-workflow';
import { z } from 'zod';

import { BaseCommand } from './base-command';
import { crudAdapter } from './headless/crud-adapter';
import { detectLifecycle } from './headless/lifecycle';
import { ensureOwner } from './headless/owner';
import { parseWorkflowSource } from './headless/parse';

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

	private readonly shutdownController = new AbortController();

	private lifecyclePromise?: Promise<void>;

	async run() {
		if (this.flags.credentials) {
			throw new UserError(
				'--credentials is not yet implemented — Task 10 of the headless implementation plan adds this.',
			);
		}

		const owner = await ensureOwner();

		const parsed = await parseWorkflowSource(this.flags.workflow);
		const imported = await crudAdapter.createWorkflows(owner, parsed);
		for (const wf of imported) {
			await crudAdapter.activateWorkflow(owner, wf.id);
		}

		const lifecycle = detectLifecycle(imported, owner);
		this.logger.info(
			`headless: ${lifecycle.kind} workflow set ready (${imported.length} workflow${imported.length === 1 ? '' : 's'})`,
		);

		this.lifecyclePromise = lifecycle.run({
			port: this.flags.port,
			host: this.flags.host,
			signal: this.shutdownController.signal,
		});

		await this.lifecyclePromise;
	}

	// Invoked by BaseCommand.onTerminationSignal when SIGTERM/SIGINT arrives.
	// Aborts the lifecycle controller, then waits for lifecycle.run's finally
	// block (deactivateAll) to settle so the BaseCommand's graceful-shutdown
	// timer guards the full teardown, not just the abort signal.
	override async stopProcess() {
		if (!this.shutdownController.signal.aborted) {
			this.shutdownController.abort();
		}
		if (this.lifecyclePromise) {
			await this.lifecyclePromise.catch(() => {
				// Errors from lifecycle.run surface via the normal awaiter in run();
				// stopProcess only cares that the teardown drained.
			});
		}
	}
}
