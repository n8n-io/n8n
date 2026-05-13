import { AuthRolesService } from '@n8n/db';
import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { z } from 'zod';

import { BaseCommand } from './base-command';
import type { CreatedCredential } from './headless/crud-adapter';
import { crudAdapter } from './headless/crud-adapter';
import { warnOnMissingEnvRefs } from './headless/env-scan';
import { HeadlessWebhookServer } from './headless/headless-webhook-server';
import { detectLifecycle, shouldActivate } from './headless/lifecycle';
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

	override async init() {
		await super.init();
		// BaseCommand initialises the DB and runs migrations but does not
		// wire up the license provider or the role↔scope mapping that
		// permission checks rely on. Only the `start`, `worker`, and
		// `webhook` commands do that explicitly. Without these two calls
		// headless fails at the first createWorkflow with either:
		// "Cannot query license state because license provider has not
		// been set" (license check inside WorkflowCreationService) or
		// "You don't have the permissions to save the workflow in this
		// project" (empty role.scopes → hasGlobalScope returns false).
		await this.initLicense();
		await Container.get(AuthRolesService).init();
		// ActiveWorkflowManager asserts that the instance role has been set
		// before allowing workflow registration. In a single-process headless
		// run we are always the leader — there's no multi-main coordination.
		this.instanceSettings.markAsLeader();
	}

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
		// Only activate workflows with an "activatable" trigger (webhook, schedule,
		// polling, etc.). Manual-only workflows are run on demand via the engine
		// adapter and stay inactive in the DB — calling activateWorkflow on them
		// errors with "Workflow cannot be activated because it has no trigger node".
		for (const wf of imported) {
			if (shouldActivate(wf)) {
				await crudAdapter.activateWorkflow(owner, wf.id);
			}
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

	async catch(error: Error) {
		this.logger.error(`headless: ${error.message}`);
		if (error.stack) this.logger.error(error.stack);
		process.exitCode = 1;
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
