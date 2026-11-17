import { Logger } from '@n8n/backend-common';
import { Container, Service } from '@n8n/di';
import { ConflictError, OperationalError } from '@n8n/errors';
import type { IDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { ExecutionLifecycleHooks } from 'n8n-core';
import { BinaryDataConfig, BinaryDataService, StorageConfig } from 'n8n-core';
import type {
	ExecutionStatus,
	IDataObject,
	IExecuteResponsePromiseData,
	INode,
	INodeExecutionData,
	IRun,
	IRunExecutionData,
	IWorkflowBase,
	IWorkflowExecutionDataProcess,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { createRunExecutionData, WAIT_INDEFINITELY, Workflow } from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';
import { getLifecycleHooksForRegularMain } from '@/execution-lifecycle/execution-lifecycle-hooks';
import { CredentialsPermissionChecker } from '@/executions/pre-execution-checks';
import { NodeTypes } from '@/node-types';

import type { StopResult } from '@/executions/execution.types';

import { moveRunBinaryData } from './compiled-binary-data';
import { CompiledEngineSync } from './compiled-engine-sync.service';
import type { WfrtWorkflowStatus } from './wfrt-admin.client';
import type {
	CompiledArtifact,
	WfrtEvent,
	WfrtFinishedEvent,
	WfrtStartedEvent,
	WfrtStepEvent,
	WfrtWaitingEvent,
} from './compiled-engine.types';
import {
	EXECUTION_SERVICE,
	MANUAL_WORKFLOW_SUFFIX,
	needsFallbackHost,
} from './compiled-engine.types';
import { runExecutionCall } from './compiled-execution-calls';
import { CompiledExecutionStore, EFFECT_SEQ_KEY, WFRT_ID_KEY } from './compiled-execution.store';
import { CompiledServiceCalls } from './compiled-service-calls';
import type { NodeUpdate } from './compiled-run-recorder';
import { CompiledRunRecorder } from './compiled-run-recorder';
import { WfrtAdminClient } from './wfrt-admin.client';

/** The part of the lifecycle hooks that the dispatcher calls. */
export type RunHooks = Pick<ExecutionLifecycleHooks, 'runHook'>;

/** One execution in `wfrt` and its n8n execution row. */
interface ExecutionState {
	wfrtId: string;
	executionId: string;
	data: IWorkflowExecutionDataProcess;
	hooks: RunHooks;
	recorder: CompiledRunRecorder;
	runExecutionData: IRunExecutionData;
	startedAt: Date;
	/** The args of the last Respond to Webhook step, for a test webhook that waits for it. */
	response?: IExecuteResponsePromiseData;
	/** The row is saved as waiting; the next event of the execution claims it back. */
	parked?: boolean;
	/** The effect number of the approval that the execution waits on. */
	effectSeq?: string;
	/** Set by the first `finished` event; later events of the execution are repeats. */
	done?: boolean;
}

const IN_PROGRESS: ReadonlySet<ExecutionStatus> = new Set(['new', 'running', 'waiting']);

/** How long a stop waits for the `finished` event of the cancelled execution. */
const STOP_TIMEOUT_MS = 10_000;

function toStatus(status: WfrtFinishedEvent['status']): ExecutionStatus {
	if (status === 'ok') return 'success';
	if (status === 'cancelled') return 'canceled';
	return 'error';
}

interface Entry {
	/** Events of one execution are handled in order, one at a time. */
	queue: Promise<void>;
	state?: ExecutionState;
}

const RESPOND_TO_WEBHOOK = 'n8n-nodes-base.respondToWebhook';

/** `wfrt` can send `finished` twice after a crash; this many recent ids are remembered. */
const FINISHED_MEMORY = 10_000;

const TRIGGER_RANK: Record<string, number> = {
	'n8n-nodes-base.webhook': 0,
	'n8n-nodes-base.scheduleTrigger': 1,
};

/** The trigger types that `wfrt` runs itself. n8n runs every other trigger and poller. */
const RUNTIME_TRIGGER_TYPES = new Set([
	'n8n-nodes-base.webhook',
	'n8n-nodes-base.scheduleTrigger',
	'n8n-nodes-base.cron',
	'n8n-nodes-base.interval',
]);

/**
 * True when `wfrt` runs the trigger of the module itself: a schedule, or the Webhook node.
 * Else the module has a stand-in webhook, and n8n runs the trigger node (a poller, a trigger
 * of an app, a Schedule Trigger whose rhythm depends on the last run).
 */
export function runtimeRunsTrigger(
	artifact: Pick<CompiledArtifact, 'ok' | 'triggers'>,
	node: INode | undefined,
): boolean {
	if (!node || !artifact.ok) return false;
	const first: unknown = artifact.triggers[0];
	const kind = isRecord(first) ? first.kind : undefined;
	return kind === 'schedule' || (kind === 'webhook' && node.type === 'n8n-nodes-base.webhook');
}

function isTriggerType(type: string): boolean {
	return /trigger$/i.test(type) || RUNTIME_TRIGGER_TYPES.has(type);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDataObject(value: unknown): value is IDataObject {
	return isRecord(value);
}

function isItemList(value: unknown): value is IDataObject[] {
	return Array.isArray(value) && value.every(isRecord);
}

/** The trigger node that the converter keeps: a webhook first, then a schedule, then others. */
export function findTriggerNode(workflow: Pick<IWorkflowBase, 'nodes' | 'connections'>) {
	const targets = new Set<string>();
	for (const byType of Object.values(workflow.connections)) {
		for (const outputs of Object.values(byType)) {
			for (const output of outputs ?? []) {
				for (const target of output ?? []) targets.add(target.node);
			}
		}
	}
	const triggers = workflow.nodes.filter(
		(n) =>
			!n.disabled &&
			!targets.has(n.name) &&
			(/trigger$/i.test(n.type) || n.type === 'n8n-nodes-base.webhook'),
	);
	triggers.sort((a, b) => (TRIGGER_RANK[a.type] ?? 2) - (TRIGGER_RANK[b.type] ?? 2));
	return triggers[0];
}

/**
 * The resume value (spec 9.4) from the item that the waiting node's v1 webhook
 * gave. A send-and-wait node gives `{ data: { approved, ... } }`; the approval
 * API envelope is `{ approved, data }`. Other nodes give their item: the
 * request of a Wait webhook, or the fields of a form.
 */
export function toResumeValue(item: INodeExecutionData): unknown {
	const { json } = item;
	const keys = Object.keys(json);
	if (keys.length === 1 && keys[0] === 'data' && isRecord(json.data)) {
		return { approved: json.data.approved === true, data: json.data };
	}
	return json;
}

/** The last path segment of a `wfrt` resume URL is the effect number. */
export function effectSeqOf(resumeUrl: string): string {
	const parts = resumeUrl.split('?')[0].split('/').filter(Boolean);
	return parts.at(-1) ?? '';
}

/**
 * Turns the events of `wfrt` into n8n executions.
 *
 * A manual run creates its execution row first and gives its id to `wfrt`. A
 * trigger run gets its id from `wfrt`; the `started` event creates the row.
 * Node events run the normal lifecycle hooks, so the editor gets the usual
 * push messages, and the `finished` event saves the execution with the
 * workflow's save settings.
 */
@Service()
export class CompiledEngineDispatcher {
	private readonly entries = new Map<string, Entry>();

	/** n8n execution id to `wfrt` execution id, for resumes. */
	private readonly wfrtIds = new Map<string, string>();

	private readonly finished = new Set<string>();

	/** Stop requests that wait for the `finished` event, by n8n execution id. */
	private readonly stopWaiters = new Map<string, () => void>();

	constructor(
		private readonly activeExecutions: ActiveExecutions,
		private readonly sync: CompiledEngineSync,
		private readonly client: WfrtAdminClient,
		private readonly nodeTypes: NodeTypes,
		private readonly credentialsPermissionChecker: CredentialsPermissionChecker,
		private readonly storageConfig: StorageConfig,
		private readonly store: CompiledExecutionStore,
		private readonly logger: Logger,
		private readonly binaryDataService: BinaryDataService,
		private readonly binaryDataConfig: BinaryDataConfig,
	) {
		this.logger = this.logger.scoped('compiled-engine');
	}

	/** Makes the hooks of one execution. Tests replace it. */
	protected createHooks(data: IWorkflowExecutionDataProcess, executionId: string): RunHooks {
		const hooks = getLifecycleHooksForRegularMain(data, executionId);
		return hooks;
	}

	// ----- manual runs -----

	async runManual(
		data: IWorkflowExecutionDataProcess,
		responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
	): Promise<string> {
		const { workflowData } = data;
		await this.credentialsPermissionChecker.check(workflowData.id, workflowData.nodes, data.userId);

		if (data.destinationNode || data.runData) {
			this.logger.info(
				'The compiled engine runs the whole workflow. Partial runs and "execute step" are not supported yet.',
				{ workflowId: workflowData.id },
			);
		}

		const triggerNode = this.manualTriggerNode(data);
		// A run that a trigger of n8n started (a poller, a trigger of an app) begins at that
		// trigger: the module is compiled with it as the start.
		const startedBy = triggerNode && isTriggerType(triggerNode.type) ? triggerNode.name : undefined;
		const loaded = await this.sync.prepareManualRun(workflowData, startedBy);
		const trigger = this.manualTriggerValue(data, loaded.artifact, triggerNode);

		const executionId = await this.activeExecutions.add(data);
		if (responsePromise) this.activeExecutions.attachResponsePromise(executionId, responsePromise);

		const state = this.createState(executionId, executionId, data, triggerNode, trigger);
		const entry: Entry = { queue: this.runBefore(state), state };
		this.entries.set(executionId, entry);

		entry.queue = entry.queue.then(async () => {
			try {
				await this.client.startExecution({
					workflowId: loaded.wfrtId,
					versionId: loaded.artifact.key,
					executionId,
					trigger,
					trace: true,
				});
			} catch (error) {
				await this.finish(state, {
					type: 'finished',
					executionId,
					status: 'error',
					error: error instanceof Error ? error.message : String(error),
					at: Date.now(),
				});
			}
		});
		return executionId;
	}

	private manualTriggerNode(data: IWorkflowExecutionDataProcess): INode | undefined {
		const stackNode = data.executionData?.executionData?.nodeExecutionStack[0]?.node;
		return stackNode ?? findTriggerNode(data.workflowData);
	}

	/**
	 * The trigger value of a manual run: the request of a test webhook, else the
	 * trigger data that the editor sent, else the pinned data of the trigger
	 * node, else an empty request or the time now.
	 */
	private manualTriggerValue(
		data: IWorkflowExecutionDataProcess,
		artifact: CompiledArtifact,
		triggerNode: INode | undefined,
	): unknown {
		const kind = isRecord(artifact.triggers[0]) ? artifact.triggers[0].kind : undefined;
		if (kind === 'schedule') return { scheduledAt: Date.now() };
		const stackItems = data.executionData?.executionData?.nodeExecutionStack[0]?.data.main[0];
		// A trigger that n8n runs has a stand-in webhook in the module: the request body is the
		// list of the items that the trigger gave.
		if (
			triggerNode &&
			!runtimeRunsTrigger(artifact, triggerNode) &&
			stackItems &&
			stackItems.length > 0
		) {
			return {
				method: 'POST',
				path: '',
				headers: {},
				params: {},
				query: {},
				// An item with files carries them under `$binary`, as items do in the runtime.
				body: stackItems.map((item) =>
					item.binary ? { ...item.json, $binary: item.binary } : item.json,
				),
			};
		}
		const fromStack = stackItems?.[0];
		const fromStart = data.triggerToStartFrom?.data?.data?.main[0]?.[0];
		const pinned = triggerNode ? data.pinData?.[triggerNode.name]?.[0] : undefined;
		const json = (fromStack ?? fromStart ?? pinned)?.json;
		const path = triggerNode?.parameters?.path;
		const request = {
			method: triggerNode?.parameters?.httpMethod ?? 'POST',
			path: typeof path === 'string' ? `/webhook/${path}` : '',
		};
		if (isRecord(json)) {
			// The item that the editor or a test webhook gave: the module adds no field to it.
			// An empty text says that the item has no such field.
			return {
				...request,
				headers: json.headers ?? {},
				params: json.params ?? {},
				query: json.query ?? {},
				body: json.body ?? null,
				webhookUrl: typeof json.webhookUrl === 'string' ? json.webhookUrl : '',
				executionMode: typeof json.executionMode === 'string' ? json.executionMode : '',
				// The Webhook node of n8n checked the token of the request and gave its payload.
				...(isRecord(json.jwtPayload) ? { jwtPayload: json.jwtPayload } : {}),
			};
		}
		// No item: the module gives the test URL of the webhook, as the v1 node in a manual run.
		return { ...request, headers: {}, params: {}, query: {}, body: null, executionMode: 'test' };
	}

	// ----- events -----

	/**
	 * Handles one event of `wfrt`. The promise resolves when the database writes
	 * of the event are done, so the caller may then advance the outbox cursor.
	 * Durable events can arrive twice after a restart; each one gives the result
	 * of its first arrival.
	 */
	async handleEvent(event: WfrtEvent): Promise<void> {
		this.logger.debug(`wfrt event ${event.type}`, {
			wfrtExecutionId: 'executionId' in event ? event.executionId : undefined,
			step: 'step' in event ? event.step : undefined,
			status: 'status' in event ? event.status : undefined,
		});
		if (event.type === 'dropped') {
			this.logger.warn(
				`wfrt dropped ${event.count} event(s) while n8n did not read them. Run data of some executions can be missing.`,
			);
			// A dropped `staticData` event would leave n8n's copy behind.
			return await this.sync.pullStaticData();
		}
		if (event.type === 'staticData') {
			// A repeated event stores the same document, so the result does not change.
			return await this.sync.saveStaticData(event.workflowId, event.staticData);
		}
		if (event.type === 'service' && event.service !== EXECUTION_SERVICE) {
			// The call runs beside the run data of the execution: it has its own answer path.
			void Container.get(CompiledServiceCalls).handle(event);
			return;
		}
		if (event.type === 'staticDataRejected') {
			this.logger.warn(`wfrt did not keep a static data change: ${event.message}`);
			return;
		}

		if (event.type === 'started') {
			if (this.entries.has(event.executionId) || this.finished.has(event.executionId)) return;
			if (event.workflowId.endsWith(MANUAL_WORKFLOW_SUFFIX)) return;
			const entry = this.track(
				event.executionId,
				this.startTriggerRun(event),
				'create the execution',
			);
			return await entry.queue;
		}

		let entry = this.entries.get(event.executionId);
		if (!entry) {
			if (this.finished.has(event.executionId)) return;
			// An execution that n8n lost track of, for example after a restart.
			entry = this.track(event.executionId, this.adopt(event.executionId), 'adopt the execution');
		}
		return await this.enqueue(entry, async (state) => await this.apply(state, event), event.type);
	}

	/** Registers an entry whose state comes from `init`. */
	private track(wfrtId: string, init: Promise<ExecutionState | undefined>, action: string): Entry {
		const entry: Entry = { queue: Promise.resolve() };
		this.entries.set(wfrtId, entry);
		entry.queue = init
			.then((state) => {
				entry.state = state;
				if (state) this.wfrtIds.set(state.executionId, wfrtId);
				else this.entries.delete(wfrtId);
			})
			.catch((error) => {
				this.entries.delete(wfrtId);
				this.logger.error(`Could not ${action} of compiled run ${wfrtId}`, {
					error: error instanceof Error ? error.message : String(error),
				});
			});
		return entry;
	}

	private async enqueue(
		entry: Entry,
		fn: (state: ExecutionState) => Promise<void>,
		label: string,
	): Promise<void> {
		entry.queue = entry.queue
			.then(async () => {
				if (entry.state) await fn(entry.state);
			})
			.catch((error) => {
				this.logger.error('Could not handle an event of the compiled engine', {
					error: error instanceof Error ? error.message : String(error),
					type: label,
				});
			});
		return await entry.queue;
	}

	/**
	 * Rebuilds the state of an execution from its row: the run data so far, and
	 * whether it waits. Returns `undefined` for an execution that is not a
	 * compiled run in progress.
	 */
	private async adopt(wfrtId: string): Promise<ExecutionState | undefined> {
		const executionId = await this.store.findExecutionId(wfrtId);
		if (!executionId) return undefined;
		const execution = await this.store.findExecution(executionId);
		if (!execution || !IN_PROGRESS.has(execution.status)) return undefined;
		if (execution.workflowData.settings?.engineType !== 'compiled') return undefined;

		const { effectSeq } = await this.store.readMapping(executionId);
		const data: IWorkflowExecutionDataProcess = {
			executionMode: execution.mode,
			workflowData: execution.workflowData,
			executionData: execution.data,
		};
		const recorder = new CompiledRunRecorder(execution.workflowData);
		recorder.seed(execution.data.resultData.runData, execution.data.resultData.lastNodeExecuted);
		execution.data.resultData.runData = recorder.getRunData();
		this.logger.info(`Adopted execution ${executionId} (wfrt ${wfrtId}) after a restart`);
		return {
			wfrtId,
			executionId,
			data,
			hooks: this.createHooks(data, executionId),
			recorder,
			runExecutionData: execution.data,
			startedAt: execution.startedAt ?? new Date(),
			parked: execution.status === 'waiting',
			effectSeq,
		};
	}

	/** Waits until all queued events are handled. For tests and shutdown. */
	async drain() {
		await Promise.all([...this.entries.values()].map(async (e) => await e.queue));
	}

	private async startTriggerRun(event: WfrtStartedEvent): Promise<ExecutionState | undefined> {
		const existing = await this.store.findExecutionId(event.executionId);
		if (existing) {
			// A repeated `started` after a restart: the row is there already, so
			// adopt it instead of making a second one.
			this.logger.debug(
				`wfrt started execution ${event.executionId} again: n8n keeps execution ${existing}`,
			);
			return await this.adopt(event.executionId);
		}
		const loaded = this.sync.findLoaded(event.workflowId);
		if (!loaded) {
			this.logger.warn(
				`A trigger run started for workflow ${event.workflowId}, which is not loaded`,
			);
			return undefined;
		}
		const executionMode: WorkflowExecuteMode =
			isRecord(event.trigger) && typeof event.trigger.scheduledAt === 'number'
				? 'trigger'
				: 'webhook';
		const data: IWorkflowExecutionDataProcess = {
			executionMode,
			workflowData: loaded.workflowData,
			executionData: createRunExecutionData({}),
		};
		const executionId = await this.activeExecutions.add(data);
		await this.store.saveMapping(executionId, { [WFRT_ID_KEY]: event.executionId });
		const state = this.createState(
			event.executionId,
			executionId,
			data,
			findTriggerNode(loaded.workflowData),
			event.trigger,
			new Date(event.at),
		);
		await this.runBefore(state);
		return state;
	}

	private createState(
		wfrtId: string,
		executionId: string,
		data: IWorkflowExecutionDataProcess,
		triggerNode: INode | undefined,
		trigger: unknown,
		startedAt = new Date(),
	): ExecutionState {
		data.executionData ??= createRunExecutionData({});
		const runExecutionData = data.executionData;
		const recorder = new CompiledRunRecorder(data.workflowData);
		recorder.start(triggerNode?.name, trigger, startedAt.getTime());
		runExecutionData.resultData.runData = recorder.getRunData();
		this.wfrtIds.set(executionId, wfrtId);
		return {
			wfrtId,
			executionId,
			data,
			hooks: this.createHooks(data, executionId),
			recorder,
			runExecutionData,
			startedAt,
		};
	}

	private async runBefore(state: ExecutionState) {
		const { workflowData } = state.data;
		const workflow = new Workflow({
			id: workflowData.id,
			name: workflowData.name,
			nodes: workflowData.nodes,
			connections: workflowData.connections,
			active: true,
			nodeTypes: this.nodeTypes,
			staticData: workflowData.staticData,
			settings: workflowData.settings,
		});
		await state.hooks.runHook('workflowExecuteBefore', [workflow, state.runExecutionData]);
	}

	private async apply(state: ExecutionState, event: WfrtEvent) {
		if (state.done) return;
		if (state.parked) {
			// The `started` step event of the effect that the execution waits on can
			// come after `waiting`. It does not mean that the wait ended.
			const waitingStep = state.runExecutionData.resultData.lastNodeExecuted;
			const sameWait =
				event.type === 'waiting' ||
				(event.type === 'step' && event.step === waitingStep && event.status === 'started');
			if (sameWait) return;
			await this.reclaim(state);
		}
		switch (event.type) {
			case 'step':
				this.captureResponse(state, event);
				return await this.send(state, state.recorder.onStep(event));
			case 'trace':
				return await this.send(state, state.recorder.onTrace(event));
			case 'service':
				// A call of the `execution` service changes the data of this execution, in the
				// order of its events.
				return await Container.get(CompiledServiceCalls).handle(
					event,
					async () => await Promise.resolve(runExecutionCall(state, event)),
				);
			case 'waiting':
				return await this.wait(state, event);
			case 'finished':
				return await this.finish(state, event);
			default:
				return;
		}
	}

	private async send(state: ExecutionState, updates: NodeUpdate[]) {
		for (const update of updates) {
			if (update.kind === 'before') {
				await state.hooks.runHook('nodeExecuteBefore', [update.nodeName, update.data]);
			} else {
				state.runExecutionData.resultData.lastNodeExecuted = update.nodeName;
				await state.hooks.runHook('nodeExecuteAfter', [
					update.nodeName,
					update.data,
					state.runExecutionData,
				]);
			}
		}
	}

	/** Keeps the response of a Respond to Webhook step for a test webhook. */
	private captureResponse(state: ExecutionState, event: WfrtStepEvent) {
		if (event.status !== 'started' || !isRecord(event.args)) return;
		const node = state.data.workflowData.nodes.find((n) => n.name === event.step);
		if (node?.type !== RESPOND_TO_WEBHOOK) return;
		const { body, headers, status, statusCode } = event.args;
		const code = typeof statusCode === 'number' ? statusCode : status;
		state.response = {
			// A list of items is the body as it is, as the Respond to Webhook node of v1 sends it.
			body:
				isDataObject(body) || typeof body === 'string' || isItemList(body)
					? body
					: { value: body ?? null },
			headers: isDataObject(headers) ? headers : {},
			statusCode: typeof code === 'number' ? code : 200,
		};
	}

	/**
	 * `wfrt` sends no step event for a response, so a test webhook gets the items
	 * of the Respond to Webhook node as the body. A Respond to Webhook node that got no
	 * item did not run in v1: it gives no response, and n8n answers as for a v1 run in
	 * which no such node ran.
	 */
	private responseFromRunData(state: ExecutionState): IExecuteResponsePromiseData | undefined {
		const runData = state.recorder.getRunData();
		const itemsOf = (node: INode) => runData[node.name]?.[0]?.data?.main[0] ?? [];
		const node = state.data.workflowData.nodes.find(
			(n) => n.type === RESPOND_TO_WEBHOOK && itemsOf(n).length > 0,
		);
		if (!node) return undefined;
		const items = itemsOf(node);
		const all = node.parameters?.respondWith === 'allIncomingItems';
		return {
			body: all ? items.map((i) => i.json) : (items[0]?.json ?? {}),
			headers: {},
			statusCode: 200,
		};
	}

	/**
	 * Saves the execution as waiting. A timed wait (`waitTill`) resumes in
	 * `wfrt` by itself; an approval waits for a request to the n8n waiting URL.
	 */
	private async wait(state: ExecutionState, event: WfrtWaitingEvent) {
		await this.send(state, state.recorder.onWaiting(event));
		state.runExecutionData.resultData.lastNodeExecuted = event.step;
		state.parked = true;
		if (event.signature) {
			// n8n's waiting-webhook and form code checks `signature` against the
			// resume token, and puts it in the URLs it makes (form page, status poll).
			state.runExecutionData.resumeToken = event.signature;
		}
		if (event.resumeUrl) {
			state.effectSeq = effectSeqOf(event.resumeUrl);
			await this.store.saveMapping(state.executionId, { [EFFECT_SEQ_KEY]: state.effectSeq });
			// The waiting node is the head of the stack, as in a v1 wait, so n8n's
			// waiting-webhook and form code can serve its URL and run its webhook.
			const node = state.data.workflowData.nodes.find((n) => n.name === event.step);
			if (node && state.runExecutionData.executionData) {
				state.runExecutionData.executionData.nodeExecutionStack = [
					{ node, data: { main: [state.recorder.inputItemsOf(node.name)] }, source: null },
				];
			}
			const { resumeUrlBase } = this.sync.resumeUrlBases();
			this.logger.info(
				`Execution ${state.executionId} waits at "${event.step}". Resume URL: ${resumeUrlBase}/${state.wfrtId}?signature=…`,
			);
		}

		const run = this.toRun(state, 'waiting');
		run.waitTill = event.waitTill !== undefined ? new Date(event.waitTill) : WAIT_INDEFINITELY;
		await state.hooks.runHook('workflowExecuteAfter', [run, {}]);
		this.activeExecutions.finalizeExecution(state.executionId, run);
	}

	/** Claims the waiting row back for the next part of the run. */
	private async reclaim(state: ExecutionState) {
		state.parked = false;
		try {
			await this.activeExecutions.add(state.data, {
				executionId: state.executionId,
				expectedStatus: 'waiting',
			});
		} catch (error) {
			this.logger.warn(`Could not claim the waiting execution ${state.executionId}`, {
				error: error instanceof Error ? error.message : String(error),
			});
		}
		state.hooks = this.createHooks(state.data, state.executionId);
		state.recorder.onResumed();
	}

	private async finish(state: ExecutionState, event: WfrtFinishedEvent) {
		state.done = true;
		const { updates, error } = state.recorder.finish(event);
		await this.send(state, updates);
		if (error) state.runExecutionData.resultData.error = error;
		this.moveToHostOnLimit(state, event);
		if (state.runExecutionData.executionData) {
			state.runExecutionData.executionData.nodeExecutionStack = [];
		}
		await this.moveBinaryData(state);

		const run = this.toRun(state, toStatus(event.status));
		await state.hooks.runHook('workflowExecuteAfter', [run, {}]);

		const response = state.response ?? this.responseFromRunData(state);
		if (response) this.activeExecutions.resolveResponsePromise(state.executionId, response);
		this.activeExecutions.resolveExecutionResponsePromise(state.executionId);
		this.activeExecutions.finalizeExecution(state.executionId, run);

		this.entries.delete(state.wfrtId);
		this.wfrtIds.delete(state.executionId);
		this.rememberFinished(state.wfrtId);
		this.stopWaiters.get(state.executionId)?.();
	}

	/**
	 * A node that reached a limit of `wfrt` that v1 does not have (a response larger than
	 * `--binary-max-file-mb`) runs in the fallback host from the next run. The converted
	 * workflow runs such a node in the host in the same run when the node sent only requests
	 * that v1 can send again. In the other cases the run failed, or the node gave an error item
	 * under a "continue" setting: n8n must not send the requests of the node twice.
	 */
	private moveToHostOnLimit(state: ExecutionState, event: WfrtFinishedEvent) {
		const workflowId = state.data.workflowData.id;
		if (!workflowId) return;
		const nodes = new Set(state.recorder.hostLimitNodes);
		const failed = state.recorder.failed;
		if (failed && (needsFallbackHost(failed.message) || needsFallbackHost(event.error))) {
			nodes.add(failed.nodeName);
		}
		for (const nodeName of nodes) {
			void this.sync.onRuntimeLimit(workflowId, nodeName).catch((error) => {
				this.logger.warn(`Could not move node "${nodeName}" to the fallback host`, {
					error: error instanceof Error ? error.message : String(error),
				});
			});
		}
	}

	/**
	 * A production run stores its binary data under its `wfrt` id while it runs. At the
	 * end, the files move to the location of the n8n execution id, before n8n saves or
	 * deletes the run (compiled-binary-data.ts). A manual run has the n8n id already.
	 */
	private async moveBinaryData(state: ExecutionState) {
		const workflowId = state.data.workflowData.id;
		if (state.wfrtId === state.executionId || !workflowId) return;
		if (this.binaryDataConfig.mode !== 'filesystem') return;
		try {
			await moveRunBinaryData(
				this.binaryDataService,
				state.runExecutionData,
				workflowId,
				state.wfrtId,
				state.executionId,
			);
		} catch (error) {
			this.logger.warn(`Could not move the binary data of execution ${state.executionId}`, {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	private toRun(state: ExecutionState, status: ExecutionStatus): IRun {
		return {
			data: state.runExecutionData,
			mode: state.data.executionMode,
			startedAt: state.startedAt,
			stoppedAt: new Date(),
			status,
			finished: status === 'success',
			storedAt: this.storageConfig.modeTag,
		};
	}

	private rememberFinished(wfrtId: string) {
		this.finished.add(wfrtId);
		if (this.finished.size > FINISHED_MEMORY) {
			const oldest = this.finished.values().next().value;
			if (oldest !== undefined) this.finished.delete(oldest);
		}
	}

	// ----- resume, stop, restart -----

	/** The entry of an n8n execution id, adopted from its row when n8n lost it. */
	private async entryOf(executionId: string): Promise<Entry | undefined> {
		const known = this.wfrtIds.get(executionId);
		if (known) return this.entries.get(known);
		const { wfrtId } = await this.store.readMapping(executionId);
		const entry = this.entries.get(wfrtId) ?? this.track(wfrtId, this.adopt(wfrtId), 'adopt');
		await entry.queue;
		return entry.state ? entry : undefined;
	}

	/** Resumes an approval that waits in `wfrt`, with the request body as the resume value. */
	async resume(executionId: string, value: unknown) {
		const entry = await this.entryOf(executionId);
		const state = entry?.state;
		if (!entry || !state?.parked || !state.effectSeq) {
			throw new ConflictError(
				`The execution "${executionId}" is not waiting in the compiled engine.`,
			);
		}
		const { effectSeq } = state;
		state.effectSeq = undefined;
		let failure: unknown;
		await this.enqueue(
			entry,
			async () => {
				await this.reclaim(state);
				try {
					await this.client.resume(
						state.wfrtId,
						effectSeq,
						state.runExecutionData.resumeToken,
						value,
					);
				} catch (error) {
					failure = error;
				}
			},
			'resume',
		);
		if (failure !== undefined) {
			throw new OperationalError('The compiled engine did not accept the resume', {
				cause: failure,
			});
		}
	}

	/**
	 * Called when n8n's v1 code resumes a waiting compiled execution: the wait
	 * tracker for a timed wait, or the waiting-webhook and form routes after the
	 * waiting node's webhook ran. In the second case the head of the stack has
	 * the node's output, which becomes the resume value. `wfrt` resumes timed
	 * waits by itself, so the first case only makes sure that the dispatcher
	 * follows the execution.
	 */
	async resumeFromN8n(
		executionId: string,
		data: IWorkflowExecutionDataProcess,
		responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
	) {
		const entry = await this.entryOf(executionId);
		const state = entry?.state;
		const head = data.executionData?.executionData?.nodeExecutionStack[0];
		const output = head?.data.main[0];
		if (!entry || !state?.parked || !head || !output || output.length === 0) return;
		if (head.node.name !== state.runExecutionData.resultData.lastNodeExecuted) return;

		const value = toResumeValue(output[0]);
		const effectSeq = state.effectSeq;
		state.effectSeq = undefined;
		await this.enqueue(
			entry,
			async () => {
				await this.reclaim(state);
				if (responsePromise) {
					this.activeExecutions.attachResponsePromise(executionId, responsePromise);
				}
				await this.client.resume(
					state.wfrtId,
					effectSeq,
					state.runExecutionData.resumeToken,
					value,
				);
			},
			'resume',
		);
	}

	/**
	 * Cancels an execution in `wfrt` and waits for its `finished` event.
	 * Returns `undefined` when `wfrt` does not know the execution.
	 */
	async stop(executionId: string): Promise<StopResult | undefined> {
		const known = this.wfrtIds.get(executionId);
		const wfrtId = known ?? (await this.store.readMapping(executionId)).wfrtId;
		const finished = new Promise<void>((resolve) => {
			const timer = setTimeout(resolve, STOP_TIMEOUT_MS);
			this.stopWaiters.set(executionId, () => {
				clearTimeout(timer);
				resolve();
			});
		});
		try {
			if (!(await this.client.cancelExecution(wfrtId))) return undefined;
			await finished;
		} finally {
			this.stopWaiters.delete(executionId);
		}
		const row = await this.store.findExecution(executionId);
		return {
			mode: row?.mode ?? 'manual',
			startedAt: row?.startedAt ?? new Date(),
			stoppedAt: row?.stoppedAt ?? new Date(),
			finished: false,
			status: row?.status ?? 'canceled',
		};
	}

	/**
	 * After n8n starts, marks the compiled executions that are still in
	 * progress in n8n as crashed when `wfrt` has no live execution of their
	 * workflow. `wfrt` does not send `finished` again from a replay, so these
	 * rows would stay running. Other rows are adopted when their events come.
	 */
	async reconcile(listed: WfrtWorkflowStatus[]) {
		const live = new Map(listed.map((w) => [w.workflowId, w.executions]));
		const crashed: string[] = [];
		for (const id of await this.store.findInProgressIds()) {
			if (this.wfrtIds.has(id)) continue;
			const execution = await this.store.findExecution(id);
			if (!execution || execution.workflowData.settings?.engineType !== 'compiled') continue;
			const workflowId = execution.workflowData.id;
			const wfrtWorkflowId =
				execution.mode === 'manual' ? `${workflowId}${MANUAL_WORKFLOW_SUFFIX}` : workflowId;
			if ((live.get(wfrtWorkflowId) ?? 0) === 0) crashed.push(id);
		}
		if (crashed.length > 0) {
			this.logger.warn(
				`Marking ${crashed.length} compiled execution(s) as crashed: wfrt does not run them any more`,
				{ executionIds: crashed },
			);
			await this.store.markAsCrashed(crashed);
		}
	}
}
