import { AuthRolesService } from '@n8n/db';
import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { z } from 'zod';

import { BaseCommand } from './base-command';
import type { CreatedCredential, CreatedWorkflow } from './headless/crud-adapter';
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
		this.logger.info(
			`headless: starting (workflow=${this.flags.workflow}${this.flags.credentials ? `, credentials=${this.flags.credentials}` : ''})`,
		);

		const owner = await ensureOwner();
		this.logger.debug(`headless: owner ready (id=${owner.id})`);

		const parsedWorkflows = await parseWorkflowSource(this.flags.workflow);
		const wfNames = parsedWorkflows.map((w) => `"${w.name}"`).join(', ');
		this.logger.info(
			`headless: parsed ${parsedWorkflows.length} workflow${parsedWorkflows.length === 1 ? '' : 's'}: ${wfNames}`,
		);
		warnOnMissingEnvRefs(parsedWorkflows);

		let createdCredentials: CreatedCredential[] = [];
		if (this.flags.credentials) {
			const parsedCredentials = await parseCredentialsFile(this.flags.credentials);
			createdCredentials = await crudAdapter.createCredentials(owner, parsedCredentials);
			const credSummary = createdCredentials.map((c) => `"${c.name}" (${c.type})`).join(', ');
			this.logger.info(
				`headless: imported ${createdCredentials.length} credential${createdCredentials.length === 1 ? '' : 's'}: ${credSummary}`,
			);
		}

		const imported = await crudAdapter.createWorkflows(owner, parsedWorkflows, createdCredentials);

		// Only activate workflows with an "activatable" trigger (webhook, schedule,
		// polling, etc.). Manual-only workflows are run on demand via the engine
		// adapter and stay inactive in the DB — calling activateWorkflow on them
		// errors with "Workflow cannot be activated because it has no trigger node".
		let activatedCount = 0;
		for (const wf of imported) {
			if (shouldActivate(wf)) {
				await crudAdapter.activateWorkflow(owner, wf.id);
				this.logger.info(`headless: activated workflow "${wf.name}"`);
				activatedCount++;
			} else {
				this.logger.debug(`headless: "${wf.name}" is manual — not activating, will run on demand`);
			}
		}

		const lifecycle = detectLifecycle(imported, owner);
		this.logger.info(
			`headless: lifecycle=${lifecycle.kind} (${activatedCount}/${imported.length} workflow${imported.length === 1 ? '' : 's'} activated)`,
		);

		// Long-lived runs always bind the HTTP server so K8s liveness/readiness
		// probes have something to hit, even when no workflow has a webhook
		// trigger (schedule-only sets still expose /healthz + /healthz/readiness).
		if (lifecycle.kind === 'long-lived') {
			this.webhookServer = Container.get(HeadlessWebhookServer);
			await this.webhookServer.init();
			await this.webhookServer.start();
			this.webhookServer.markAsReady();
			const base = `http://${this.flags.host}:${this.flags.port}`;
			this.logger.info(`headless: HTTP server listening on ${base}`);
			this.logger.info(
				`headless: health   GET ${base}/healthz   |   readiness   GET ${base}/healthz/readiness`,
			);
			const webhookUrls = collectWebhookUrls(imported, base);
			if (webhookUrls.length > 0) {
				this.logger.info(`headless: webhook endpoints (${webhookUrls.length}):`);
				for (const url of webhookUrls) this.logger.info(`  ${url}`);
			}
		}

		signalReady();
		this.logger.info(
			lifecycle.kind === 'manual'
				? 'headless: running manual workflow(s)…'
				: 'headless: waiting for triggers (SIGTERM/SIGINT to stop)',
		);

		this.lifecyclePromise = lifecycle.run({
			port: this.flags.port,
			host: this.flags.host,
			signal: this.shutdownController.signal,
		});

		await this.lifecyclePromise;

		this.logger.info(
			lifecycle.kind === 'manual'
				? 'headless: all workflows finished'
				: 'headless: shutdown complete',
		);
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
		this.logger.info('headless: stopping (deactivating workflows, closing listener)…');
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

function getStringParam(node: INode, key: string): string | undefined {
	const value = node.parameters?.[key];
	return typeof value === 'string' ? value : undefined;
}

/**
 * Extract a flat list of webhook/form-trigger URLs from the activated workflow
 * set so they can be logged at startup. Helpful in container logs where it is
 * otherwise opaque what endpoints the listener actually serves.
 */
function collectWebhookUrls(workflows: CreatedWorkflow[], base: string): string[] {
	const urls: string[] = [];
	for (const wf of workflows) {
		for (const node of wf.parsed.nodes) {
			if (node.type === 'n8n-nodes-base.webhook') {
				const method = (getStringParam(node, 'httpMethod') ?? 'GET').toUpperCase();
				const path = getStringParam(node, 'path');
				if (path) urls.push(`${method.padEnd(6)} ${base}/webhook/${path}`);
			} else if (node.type === 'n8n-nodes-base.formTrigger') {
				const path = getStringParam(node, 'path');
				if (path) urls.push(`GET    ${base}/form/${path}`);
			}
		}
	}
	return urls;
}
