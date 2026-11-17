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
	 * Why the active version of a workflow cannot run on the compiled engine, or `undefined`
	 * when it can. Core code asks before it registers the triggers of the version: a version
	 * that cannot run gets no trigger, as a version that n8n cannot load.
	 */
	compileError(workflow: WorkflowEntity): Promise<string | undefined>;

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
 * The seam between core code and the `compiled-engine` module. Core code
 * asks `handles()` and then calls the provider. When the module is not
 * enabled, a workflow that selects the compiled engine fails with a reason.
 * It does not fall back to v1, because the user selected the engine.
 */
@Service()
export class CompiledEngineBridge {
	private provider: CompiledEngineProvider | undefined;

	registerProvider(provider: CompiledEngineProvider) {
		this.provider = provider;
	}

	get isEnabled() {
		return this.provider !== undefined;
	}

	handles(workflow: { settings?: IWorkflowSettings | null } | undefined | null): boolean {
		return workflow?.settings?.engineType === COMPILED_ENGINE_TYPE;
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
