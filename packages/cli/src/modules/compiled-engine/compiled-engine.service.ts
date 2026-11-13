import type { CompiledEngineCompileResponse } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import type { WorkflowEntity } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';
import type { IDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { Request, Response } from 'express';
import type { IExecuteResponsePromiseData, IWorkflowExecutionDataProcess } from 'n8n-workflow';

import type { CompiledEngineProvider } from '@/services/compiled-engine-bridge.service';
import { CompiledEngineBridge } from '@/services/compiled-engine-bridge.service';

import { CompiledEngineProcesses } from './compiled-engine-processes';
import { CompiledEngineSync } from './compiled-engine-sync.service';
import { CompiledEngineConfig } from './compiled-engine.config';
import { CompiledEngineDispatcher } from './compiled-engine.dispatcher';
import { CompiledExecutionStore } from './compiled-execution.store';
import { CompiledWebhookForwarder } from './compiled-webhook.forwarder';
import { WfrtAdminClient } from './wfrt-admin.client';

const RECONNECT_DELAY_MS = 1000;

/**
 * Runs the compiled engine: starts the processes, follows the event stream
 * of `wfrt`, and serves the core code through the compiled engine bridge.
 */
@Service()
export class CompiledEngineService implements CompiledEngineProvider {
	private stopped = false;

	private abort?: AbortController;

	private loop?: Promise<void>;

	constructor(
		private readonly config: CompiledEngineConfig,
		private readonly processes: CompiledEngineProcesses,
		private readonly client: WfrtAdminClient,
		private readonly sync: CompiledEngineSync,
		private readonly dispatcher: CompiledEngineDispatcher,
		private readonly forwarder: CompiledWebhookForwarder,
		private readonly bridge: CompiledEngineBridge,
		private readonly eventService: EventService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly store: CompiledExecutionStore,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('compiled-engine');
	}

	async start() {
		this.stopped = false;
		this.client.setSecret(this.processes.adminSecret);
		this.bridge.registerProvider(this);
		this.listen();
		if (this.config.manageProcesses) {
			try {
				await this.processes.start();
			} catch (error) {
				this.logger.error(
					`The compiled engine did not start: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}
		this.loop = this.followEvents();
	}

	async shutdown() {
		this.stopped = true;
		this.abort?.abort();
		await this.loop?.catch(() => {});
		await this.dispatcher.drain();
		await this.processes.stop();
	}

	private listen() {
		this.eventService.on('workflow-saved', ({ workflow }) => {
			if (!this.bridge.handles(workflow)) return;
			// Compile at save, so the result is cached when the user runs or publishes the workflow.
			void this.sync.compile(workflow).catch((error) => {
				this.logger.warn(`Could not compile workflow ${workflow.id}`, {
					error: error instanceof Error ? error.message : String(error),
				});
			});
		});
		let variablesTimer: NodeJS.Timeout | undefined;
		const pushVariables = () => {
			// One push for a burst of changes, after the variables cache is refreshed.
			clearTimeout(variablesTimer);
			variablesTimer = setTimeout(() => {
				this.sync.pushVariables().catch(() => {});
			}, 200);
		};
		this.eventService.on('variable-created', pushVariables);
		this.eventService.on('variable-updated', pushVariables);
		this.eventService.on('variable-deleted', pushVariables);
		this.eventService.on('credentials-updated', ({ credentialId }) => {
			void this.sync.onCredentialChanged(credentialId).catch((error) => {
				this.logger.warn('Could not send the changed credentials to wfrt', {
					error: error instanceof Error ? error.message : String(error),
				});
			});
		});
	}

	/** Follows the event stream of `wfrt` and connects again when it ends. */
	private async followEvents() {
		while (!this.stopped) {
			this.abort = new AbortController();
			try {
				await this.client.streamEvents(
					this.abort.signal,
					async () => {
						const listed = await this.sync.onConnected();
						await this.dispatcher.reconcile(listed).catch((error) => {
							this.logger.warn('Could not reconcile compiled executions', {
								error: error instanceof Error ? error.message : String(error),
							});
						});
					},
					(event) => this.dispatcher.handleEvent(event),
				);
			} catch (error) {
				if (this.stopped) break;
				this.logger.debug('The wfrt event stream is not available', {
					error: error instanceof Error ? error.message : String(error),
				});
			}
			if (this.sync.isConnected) this.logger.warn('The wfrt event stream closed');
			this.sync.onDisconnected();
			if (!this.stopped) await new Promise((r) => setTimeout(r, RECONNECT_DELAY_MS));
		}
	}

	// ----- CompiledEngineProvider -----

	async run(
		data: IWorkflowExecutionDataProcess,
		responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
	) {
		return await this.dispatcher.runManual(data, responsePromise);
	}

	async activate(workflow: WorkflowEntity) {
		await this.sync.activate(workflow);
	}

	async deactivate(workflowId: string) {
		await this.sync.deactivate(workflowId);
	}

	async resumeFromN8n(
		executionId: string,
		data: IWorkflowExecutionDataProcess,
		responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
	) {
		await this.dispatcher.resumeFromN8n(executionId, data, responsePromise);
	}

	async findExecutionId(wfrtId: string) {
		return await this.store.findExecutionId(wfrtId);
	}

	async stop(executionId: string) {
		return await this.dispatcher.stop(executionId);
	}

	async forwardWebhook({
		request,
		response,
		path,
	}: {
		request: Request;
		response: Response;
		workflowId: string;
		path: string;
	}) {
		await this.forwarder.forward(request, response, path);
	}

	// ----- compile endpoint -----

	async compileSaved(workflowId: string): Promise<CompiledEngineCompileResponse> {
		const workflow = await this.workflowRepository.findById(workflowId);
		if (!workflow) throw new NotFoundError(`The workflow "${workflowId}" does not exist.`);
		const artifact = await this.sync.compile(workflow);
		return {
			ok: artifact.ok,
			diagnostics: artifact.diagnostics,
			nodes: artifact.nodes,
			versionId: workflow.versionId,
			compiledAt: artifact.compiledAt,
		};
	}
}
