import type { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError } from '@n8n/errors';
import type { IDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { Request, Response } from 'express';
import type {
	ExecutionStatus,
	IExecuteResponsePromiseData,
	IWorkflowBase,
	IWorkflowExecutionDataProcess,
	IWorkflowSettings,
	WorkflowExecuteMode,
} from 'n8n-workflow';

/** The outcome of a stop, as `ExecutionService.stop` returns it. */
export interface CompiledEngineStopResult {
	mode: WorkflowExecuteMode;
	startedAt: Date;
	stoppedAt?: Date;
	finished: boolean;
	status: ExecutionStatus;
}

/** The engine type that selects the compiled engine (`wfrt`). */
export const COMPILED_ENGINE_TYPE = 'compiled';

/**
 * The part of the compiled engine that core code calls. The
 * `compiled-engine` backend module registers the implementation.
 */
export interface CompiledEngineProvider {
	/** Starts a run (manual, or a test webhook) and returns the n8n execution id. */
	run(
		data: IWorkflowExecutionDataProcess,
		responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
	): Promise<string>;

	/** Loads the active version of a workflow into `wfrt` and starts its triggers. */
	activate(workflow: WorkflowEntity): Promise<void>;

	/**
	 * True when `wfrt` is connected and has the published module of the workflow. When it is
	 * false, a production webhook request of the workflow runs on v1.
	 */
	isServing(workflowId: string): boolean;

	/** Stops the triggers of a workflow in `wfrt`. */
	deactivate(workflowId: string): Promise<void>;

	/**
	 * The ids of the trigger and poll nodes that n8n runs for a compiled workflow: every
	 * one except the trigger that `wfrt` runs itself (a Webhook or a schedule). When such a
	 * node fires, n8n starts the run in `wfrt` with the items of the node.
	 */
	n8nTriggerNodeIds(workflow: IWorkflowBase): Promise<Set<string>>;

	/**
	 * True when `wfrt` serves the webhook of this node itself (a Webhook node). The webhook
	 * of another node (a trigger of an app) runs the node in n8n, which then starts the run.
	 */
	servesWebhook(workflow: Pick<IWorkflowBase, 'nodes' | 'connections'>, nodeName: string): boolean;

	/** Sends a production webhook request to `wfrt` and writes its response. */
	forwardWebhook(input: {
		request: Request;
		response: Response;
		workflowId: string;
		path: string;
	}): Promise<void>;

	/**
	 * Called instead of a v1 resume of a waiting compiled execution: by the wait
	 * tracker, or by the waiting-webhook and form routes after the waiting
	 * node's webhook ran. The head of the stack then has the resume value.
	 */
	resumeFromN8n(
		executionId: string,
		data: IWorkflowExecutionDataProcess,
		responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
	): Promise<void>;

	/** The n8n execution id of a `wfrt` execution id (`wfrt-<n>`, or a manual run's n8n id). */
	findExecutionId(wfrtId: string): Promise<string | undefined>;

	/** Cancels an execution in `wfrt`. `undefined` when `wfrt` does not know it. */
	stop(executionId: string): Promise<CompiledEngineStopResult | undefined>;
}

/**
 * The compiled engine cannot take a run now: the workflow does not compile, or `wfrt` is
 * not connected. The provider throws it before it makes an execution, so the caller can
 * start the run on v1.
 */
export class CompiledEngineUnavailableError extends UserError {}

/** The most workflows whose reason for v1 is kept. An older entry goes; its workflow is checked again at its next activation. */
const MAX_WORKFLOWS_ON_V1 = 10_000;

type EngineChoice = { id?: string; settings?: IWorkflowSettings | null } | undefined | null;

/**
 * The seam between core code and the `compiled-engine` module. Core code
 * asks `handles()` and then calls the provider.
 *
 * Anything that runs on v1 must run: a workflow that selects the compiled engine runs on
 * v1 when the module is not enabled, and when its published version cannot run on the
 * compiled engine (it does not compile, or `wfrt` refuses the module). n8n then registers
 * its triggers and serves its webhooks as for a v1 workflow, and logs the reason. The
 * check runs again at each activation, so the workflow moves to the compiled engine when
 * a later version or a later build compiles.
 */
@Service()
export class CompiledEngineBridge {
	private provider: CompiledEngineProvider | undefined;

	/** The reason, by workflow id, for each workflow whose published version runs on v1. */
	private readonly onV1 = new Map<string, string>();

	registerProvider(provider: CompiledEngineProvider) {
		this.provider = provider;
	}

	get isEnabled() {
		return this.provider !== undefined;
	}

	/** True when the workflow selects the compiled engine and the module is enabled. */
	selects(workflow: EngineChoice): boolean {
		return this.provider !== undefined && workflow?.settings?.engineType === COMPILED_ENGINE_TYPE;
	}

	/** True when the published version of the workflow runs on the compiled engine. */
	handles(workflow: EngineChoice): boolean {
		if (!this.selects(workflow)) return false;
		return workflow?.id === undefined || !this.onV1.has(workflow.id);
	}

	/** The published version of the workflow runs on v1 from now on, for this reason. */
	runOnV1(workflowId: string, reason: string) {
		this.onV1.delete(workflowId);
		if (this.onV1.size >= MAX_WORKFLOWS_ON_V1) {
			const oldest = this.onV1.keys().next();
			if (!oldest.done) this.onV1.delete(oldest.value);
		}
		this.onV1.set(workflowId, reason);
	}

	/** The published version of the workflow runs on the compiled engine again. */
	runOnCompiledEngine(workflowId: string) {
		this.onV1.delete(workflowId);
	}

	/** Why the published version of the workflow runs on v1, when it does. */
	reasonForV1(workflowId: string): string | undefined {
		return this.onV1.get(workflowId);
	}

	/** True for an execution id that `wfrt` made for a trigger run. */
	isRuntimeExecutionId(id: string | undefined): id is string {
		return id?.startsWith('wfrt-') ?? false;
	}

	get(): CompiledEngineProvider {
		if (!this.provider) {
			throw new UserError(
				'This workflow uses the compiled engine, but the "compiled-engine" module is not enabled. Add it to N8N_ENABLED_MODULES, or change the engine in the workflow settings.',
			);
		}
		return this.provider;
	}
}
