import type { CompiledEngineCompileResponse } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import type { WorkflowEntity } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';
import type { IDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { Request, Response } from 'express';
import type {
	IExecuteResponsePromiseData,
	IWorkflowBase,
	IWorkflowExecutionDataProcess,
} from 'n8n-workflow';

import type { CompiledEngineProvider } from '@/services/compiled-engine-bridge.service';
import { CompiledEngineBridge } from '@/services/compiled-engine-bridge.service';

import { CompiledEngineProcesses } from './compiled-engine-processes';
import { CompiledEngineSync } from './compiled-engine-sync.service';
import { CompiledEngineConfig } from './compiled-engine.config';
import {
	CompiledEngineDispatcher,
	findTriggerNode,
	runtimeRunsTrigger,
} from './compiled-engine.dispatcher';
import type { WfrtAck, WfrtEvent, WfrtEventCursor } from './compiled-engine.types';
import { isSequencedEvent } from './compiled-engine.types';
import { CompiledExecutionStore } from './compiled-execution.store';
import { CompiledWebhookForwarder } from './compiled-webhook.forwarder';
import { WfrtAdminClient, WfrtRequestError } from './wfrt-admin.client';

const RECONNECT_DELAY_MS = 1000;

/** How often n8n stores and acks the handled events of the outbox. */
const ACK_INTERVAL_MS = 250;

/** How many handled events force a store and an ack before the interval ends. */
const ACK_BATCH_EVENTS = 200;

/** Queue key of the events that carry no outbox position (an older `wfrt`). */
const UNSEQUENCED = 'unsequenced';

/**
 * Runs the compiled engine: starts the processes, follows the event stream
 * of `wfrt`, and serves the core code through the compiled engine bridge.
 */
@Service()
export class CompiledEngineService implements CompiledEngineProvider {
	private stopped = false;

	private abort?: AbortController;

	private loop?: Promise<void>;

	/** The last fully handled seq of each shard of the `wfrt` event outbox. */
	private cursor: WfrtEventCursor = {};

	/** The seq per shard that n8n has acked to `wfrt`. */
	private readonly acked = new Map<number, number>();

	/** Shards whose cursor stopped at an event that n8n did not handle. */
	private readonly blocked = new Set<number>();

	/** The events of one shard are handled in seq order, one at a time. */
	private readonly eventChains = new Map<string, Promise<void>>();

	/**
	 * The last event of each execution that waits or runs. The events of an execution come
	 * with and without an outbox position, so they are in different chains: each one also
	 * waits for the earlier events of its execution, and the run data is complete when
	 * `finished` is handled. An entry goes when its event is handled.
	 */
	private readonly executionTails = new Map<string, Promise<void>>();

	private handledSinceAck = 0;

	private ackTimer?: NodeJS.Timeout;

	private ackChain: Promise<void> = Promise.resolve();

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
		await this.settleEvents();
		await this.dispatcher.drain();
		// The last cursor and acks, so a restart resumes where n8n stopped.
		await this.flushEvents().catch((error) => {
			this.logger.warn('Could not store the cursor of the wfrt event outbox', {
				error: error instanceof Error ? error.message : String(error),
			});
		});
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
		await this.loadCursor();
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
						// A crash can leave events stored that n8n handled but did not ack.
						void this.flushEvents().catch(() => {});
					},
					(event) => this.acceptEvent(event),
					this.cursor,
				);
			} catch (error) {
				if (this.stopped) break;
				this.logger.debug('The wfrt event stream is not available', {
					error: error instanceof Error ? error.message : String(error),
				});
			}
			if (this.sync.isConnected) this.logger.warn('The wfrt event stream closed');
			this.sync.onDisconnected();
			// The next connect resumes from the cursor, so the events of a shard
			// that stopped at a failed event arrive again.
			this.blocked.clear();
			if (!this.stopped) await new Promise((r) => setTimeout(r, RECONNECT_DELAY_MS));
		}
	}

	// ----- durable events of the wfrt outbox -----

	private async loadCursor() {
		try {
			this.cursor = await this.store.readEventCursor();
		} catch (error) {
			this.cursor = {};
			this.logger.warn('Could not read the cursor of the wfrt event outbox', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/** Queues one event behind the earlier events of its shard. */
	private acceptEvent(event: WfrtEvent) {
		const key = isSequencedEvent(event) ? String(event.shard) : UNSEQUENCED;
		const previous = this.eventChains.get(key) ?? Promise.resolve();
		const executionId = 'executionId' in event ? event.executionId : undefined;
		const earlier = executionId === undefined ? undefined : this.executionTails.get(executionId);
		// `handleEvent` does not reject, so the two waits end.
		const next = Promise.all([previous, earlier]).then(async () => await this.handleEvent(event));
		this.eventChains.set(key, next);
		if (executionId !== undefined) this.executionTails.set(executionId, next);
		void next
			.catch(() => {})
			.then(() => {
				if (this.eventChains.get(key) === next) this.eventChains.delete(key);
				if (executionId !== undefined && this.executionTails.get(executionId) === next) {
					this.executionTails.delete(executionId);
				}
			});
	}

	/** Waits for the events of the stream that n8n queued. */
	private async settleEvents() {
		for (let round = 0; round < 10 && this.eventChains.size > 0; round++) {
			await Promise.all([...this.eventChains.values()].map(async (chain) => await chain));
		}
	}

	/**
	 * Handles one event and then advances the cursor of its shard. An event that
	 * n8n could not handle stops the cursor of its shard, so `wfrt` sends it again.
	 */
	private async handleEvent(event: WfrtEvent) {
		try {
			await this.dispatcher.handleEvent(event);
		} catch (error) {
			if (isSequencedEvent(event)) this.blocked.add(event.shard);
			this.logger.error('Could not handle an event of the wfrt event outbox', {
				error: error instanceof Error ? error.message : String(error),
				type: event.type,
			});
			return;
		}
		if (!isSequencedEvent(event) || this.blocked.has(event.shard)) return;
		const shard = String(event.shard);
		if (event.seq <= (this.cursor[shard] ?? 0)) return;
		this.cursor[shard] = event.seq;
		this.handledSinceAck++;
		this.scheduleAck();
	}

	/** Stores and acks a burst of handled events, at most every 250 ms or 200 events. */
	private scheduleAck() {
		if (this.handledSinceAck >= ACK_BATCH_EVENTS) {
			this.flushInBackground();
			return;
		}
		if (this.ackTimer) return;
		this.ackTimer = setTimeout(() => {
			this.ackTimer = undefined;
			this.flushInBackground();
		}, ACK_INTERVAL_MS);
		this.ackTimer.unref?.();
	}

	private flushInBackground() {
		void this.flushEvents().catch((error) => {
			this.logger.debug('Could not store the cursor of the wfrt event outbox', {
				error: error instanceof Error ? error.message : String(error),
			});
		});
	}

	/**
	 * Stores the handled cursor and then acks it. One flush runs at a time, so
	 * the stored cursor never goes back and an ack never goes out before it.
	 */
	async flushEvents(): Promise<void> {
		if (this.ackTimer) {
			clearTimeout(this.ackTimer);
			this.ackTimer = undefined;
		}
		const run = this.ackChain.then(async () => await this.storeCursor());
		this.ackChain = run.catch(() => {});
		return await run;
	}

	private async storeCursor() {
		const acks = this.pendingAcks();
		if (this.handledSinceAck === 0 && acks.length === 0) return;
		const cursor = { ...this.cursor };
		await this.store.saveEventCursor(cursor);
		this.handledSinceAck = 0;
		await this.sendAcks(acks);
	}

	/** The acks of the shards whose handled seq is ahead of their acked seq. */
	private pendingAcks(): WfrtAck[] {
		const acks: WfrtAck[] = [];
		for (const [shard, seq] of Object.entries(this.cursor)) {
			if (!Number.isInteger(seq)) continue;
			if (seq <= (this.acked.get(Number(shard)) ?? 0)) continue;
			acks.push({ shard: Number(shard), seq });
		}
		return acks;
	}

	private async sendAcks(acks: WfrtAck[]) {
		try {
			await this.client.ackEvents(acks);
		} catch (error) {
			if (error instanceof WfrtRequestError && error.status === 400) {
				// wfrt does not know these events: its outbox started again.
				this.logger.warn('wfrt refused the ack of the event outbox cursor', {
					error: error.message,
				});
				for (const ack of acks) this.acked.set(ack.shard, ack.seq);
				return;
			}
			throw error;
		}
		for (const ack of acks) this.acked.set(ack.shard, ack.seq);
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

	async compileError(workflow: WorkflowEntity) {
		return await this.sync.compileError(workflow);
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

	async n8nTriggerNodeIds(workflow: IWorkflowBase): Promise<Set<string>> {
		const kept = findTriggerNode(workflow);
		const artifact = await this.sync.compile(workflow);
		const runtime = runtimeRunsTrigger(artifact, kept) ? kept?.id : undefined;
		return new Set(
			workflow.nodes.filter((node) => !node.disabled && node.id !== runtime).map((node) => node.id),
		);
	}

	servesWebhook(workflow: Pick<IWorkflowBase, 'nodes' | 'connections'>, nodeName: string): boolean {
		const kept = findTriggerNode(workflow);
		return kept?.name === nodeName && kept.type === 'n8n-nodes-base.webhook';
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
