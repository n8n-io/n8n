import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { z } from 'zod';

import { BaseCommand } from './base-command';
import type { CreatedCredential } from './headless/crud-adapter';
import { crudAdapter } from './headless/crud-adapter';
import { warnOnMissingEnvRefs } from './headless/env-scan';
import { HeadlessWebhookServer } from './headless/headless-webhook-server';
import { detectLifecycle } from './headless/lifecycle';
import { ensureOwner } from './headless/owner';
import { parseCredentialsFile, parseWorkflowSource } from './headless/parse';
import { signalReady } from './headless/ready-signal';

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

	private webhookServer?: HeadlessWebhookServer;

	async run() {
		const owner = await ensureOwner();

		const parsedWorkflows = await parseWorkflowSource(this.flags.workflow);
		warnOnMissingEnvRefs(parsedWorkflows);

		let createdCredentials: CreatedCredential[] = [];
		if (this.flags.credentials) {
			const parsedCredentials = await parseCredentialsFile(this.flags.credentials);
			createdCredentials = await crudAdapter.createCredentials(owner, parsedCredentials);
		}

		const imported = await crudAdapter.createWorkflows(owner, parsedWorkflows, createdCredentials);
		for (const wf of imported) {
			await crudAdapter.activateWorkflow(owner, wf.id);
		}

		const lifecycle = detectLifecycle(imported, owner);
		this.logger.info(
			`headless: ${lifecycle.kind} workflow set ready (${imported.length} workflow${imported.length === 1 ? '' : 's'})`,
		);

		if (lifecycle.needsWebhookListener) {
			this.webhookServer = Container.get(HeadlessWebhookServer);
			await this.webhookServer.init();
			await this.webhookServer.start();
			this.webhookServer.markAsReady();
			this.logger.info(
				`headless: webhook listener on http://${this.flags.host}:${this.flags.port}`,
			);
		}

		signalReady();

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
		if (this.webhookServer) {
			await this.webhookServer.close();
		}
	}
}
