import { Logger } from '@n8n/backend-common';
import type { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type {
	IDataObject,
	IExecuteResponsePromiseData,
	INode,
	IPinData,
	IRun,
	IWorkflowExecutionDataProcess,
} from 'n8n-workflow';
import { createRunExecutionData } from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';
import { SubworkflowPolicyDenialError } from '@/errors/subworkflow-policy-denial.error';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import { SubworkflowPolicyChecker } from '@/executions/pre-execution-checks';
import {
	detectTriggerNode,
	formatResult,
	inferInputSchema,
	isWorkflowToolResponse,
	validateCompatibility,
} from '@/modules/agents/tools/workflow-tool-factory';
import { WorkflowToolUnavailableError } from '@/modules/agents/tools/workflow-tool-unavailable-error';
import { WorkflowToolWorkflowLoader } from '@/modules/agents/tools/workflow-tool-workflow-loader.service';
import { WebhookResponseRelay } from '@/scaling/webhook-response-relay';
import { WorkflowRunner } from '@/workflow-runner';

import { AppRepository } from '../app.repository';
import { AppsConfig } from '../apps.config';
import { AppRuntimeError } from './app-runtime.error';

/**
 * How long a call blocks on the execution. Longer than a browser should hold a request,
 * shorter than the 120 s the agents tool waits; past it the caller gets a 202 and the
 * execution keeps running, so a slow workflow is not killed by a page timeout.
 */
const SYNC_WAIT_MS = 60_000;

/** The only node whose error text is written for the app's users, so it may reach them. */
const STOP_AND_ERROR_NODE_TYPE = 'n8n-nodes-base.stopAndError';
const GENERIC_FAILURE_MESSAGE = 'The workflow failed.';

export type AppRuntimeRunResult =
	| { executionId: string; status: 'running'; principal: null }
	| {
			executionId: string;
			status: string;
			output: unknown;
			/** Set when a Respond to Webhook node answered with binary, which v1 does not stream. */
			outputTruncated?: true;
			error?: string;
			principal: null;
	  };

/** The input arrived as a JSON body, so a parsed object is JSON-compatible. */
function isDataObject(value: unknown): value is IDataObject {
	return isRecord(value);
}

/** Which app binding started a run; goes into logs, never into the response. */
interface RunOrigin {
	appId: string;
	namespace: string;
	key: string;
}

@Service()
export class AppRuntimeService {
	/**
	 * Calls that hold a run right now. `integrated` runs are exempt from the instance
	 * concurrency queue, so this public route needs its own cap.
	 */
	private inFlight = 0;

	constructor(
		private readonly appRepository: AppRepository,
		private readonly workflowLoader: WorkflowToolWorkflowLoader,
		private readonly subworkflowPolicyChecker: SubworkflowPolicyChecker,
		private readonly workflowRunner: WorkflowRunner,
		private readonly activeExecutions: ActiveExecutions,
		private readonly webhookResponseRelay: WebhookResponseRelay,
		private readonly executionPersistence: ExecutionPersistence,
		private readonly logger: Logger,
		private readonly appsConfig: AppsConfig,
	) {}

	/**
	 * Runs the published workflow bound to `key` as the app's project, the way an agent
	 * tool does. Each refusal has its own code so the app can tell a missing binding from
	 * an unpublished workflow.
	 */
	async runWorkflow(namespace: string, key: string, body: unknown): Promise<AppRuntimeRunResult> {
		const app = await this.appRepository.findByNamespace(namespace);
		if (!app) {
			throw new AppRuntimeError(404, 'app_not_found', `No app is served at /apps/${namespace}.`);
		}

		const binding = app.bindings.find((b) => b.key === key && b.kind === 'workflow');
		if (!binding) {
			throw new AppRuntimeError(
				404,
				'binding_not_found',
				`App "${app.namespace}" has no workflow bound as "${key}".`,
			);
		}

		const workflow = await this.loadPublishedWorkflow(app.projectId, binding.workflowId);

		try {
			validateCompatibility(workflow);
		} catch (error) {
			// Fixed text: the original names the private workflow's nodes to an anonymous caller.
			if (error instanceof WorkflowToolUnavailableError) {
				throw new AppRuntimeError(
					409,
					'workflow_incompatible',
					'The bound workflow cannot be run from an app. Check its trigger and nodes in n8n.',
				);
			}
			throw error;
		}

		try {
			await this.subworkflowPolicyChecker.checkForProject(workflow, app.projectId);
		} catch (error) {
			if (error instanceof SubworkflowPolicyDenialError) {
				throw new AppRuntimeError(
					403,
					'workflow_not_callable',
					'The bound workflow does not allow this app to call it. Check its "This workflow can be called by" setting.',
				);
			}
			throw error;
		}

		const trigger = detectTriggerNode(workflow);
		const parsed = inferInputSchema(trigger.node, trigger.triggerType).safeParse(body);
		if (!parsed.success || !isDataObject(parsed.data)) {
			// Path and code only: the full issue restates the private trigger's expected types.
			throw new AppRuntimeError(
				400,
				'invalid_input',
				'The request body does not match the workflow inputs.',
				parsed.success
					? undefined
					: parsed.error.issues.map(({ path, code }) => ({ path: path.map(String), code })),
			);
		}

		return await this.execute(workflow, trigger.node, parsed.data, {
			appId: app.id,
			namespace: app.namespace,
			key,
		});
	}

	private async loadPublishedWorkflow(projectId: string, workflowId: string) {
		try {
			const workflow = await this.workflowLoader.loadWorkflow(
				projectId,
				{ workflowId, workflowName: '' },
				{ usePublishedVersion: true },
			);
			if (!workflow) {
				throw new AppRuntimeError(
					404,
					'workflow_not_found',
					'The bound workflow no longer exists in the app’s project.',
				);
			}
			return workflow;
		} catch (error) {
			if (error instanceof WorkflowToolUnavailableError && error.reason === 'not_published') {
				throw new AppRuntimeError(
					409,
					'workflow_not_published',
					'The bound workflow is not published. Publish it to make it callable from the app.',
				);
			}
			throw error;
		}
	}

	/** Same run setup as `executeWorkflow` in the workflow tool factory: the input is pinned on the trigger. */
	private async execute(
		workflow: WorkflowEntity,
		triggerNode: INode,
		input: IDataObject,
		origin: RunOrigin,
	): Promise<AppRuntimeRunResult> {
		const pinData: IPinData = { [triggerNode.name]: [{ json: input }] };
		const runData: IWorkflowExecutionDataProcess = {
			executionMode: 'integrated',
			workflowData: workflow,
			startNodes: [{ name: triggerNode.name, sourceData: null }],
			pinData,
			executionData: createRunExecutionData({
				startData: {},
				resultData: { pinData, runData: {} },
				executionData: {
					contextData: {},
					metadata: {},
					nodeExecutionStack: [
						{
							node: triggerNode,
							data: { main: [pinData[triggerNode.name]] },
							source: null,
						},
					],
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			}),
		};

		const responsePromise = createDeferredPromise<IExecuteResponsePromiseData>();
		let webhookResponse: IExecuteResponsePromiseData | undefined;
		void responsePromise.promise
			.then((response) => {
				webhookResponse = response;
			})
			.catch(() => {});

		const { executionId, run } = await this.holdRun(async () => {
			const executionId = await this.workflowRunner.run(
				runData,
				undefined,
				undefined,
				undefined,
				responsePromise,
			);
			return { executionId, run: await this.waitForRun(executionId) };
		});
		if (run === 'running') return { executionId, status: 'running', principal: null };

		// Same lookup as `extractResult`, kept apart because the failing node is needed below.
		const execution =
			run ??
			(await this.executionPersistence.findSingleExecution(executionId, {
				includeData: true,
				unflattenData: true,
			}));
		if (!execution) return { executionId, status: 'unknown', output: [], principal: null };

		const result = formatResult(executionId, execution.status, execution.data, false);
		if (result.status !== 'success') {
			// The raw message names hosts, tables and credentials of a private workflow, so only
			// the operator's log gets it.
			this.logger.warn('Bound workflow run did not succeed', {
				...origin,
				executionId,
				status: result.status,
				error: result.error,
			});
			const failedNode = workflow.nodes.find(
				(node) => node.name === execution.data.resultData.lastNodeExecuted,
			);
			const error =
				failedNode?.type === STOP_AND_ERROR_NODE_TYPE && result.error
					? result.error
					: GENERIC_FAILURE_MESSAGE;
			return { executionId, status: result.status, output: [], error, principal: null };
		}
		const base = { executionId, status: result.status, principal: null };

		if (isWorkflowToolResponse(webhookResponse)) {
			const { body } = await this.webhookResponseRelay.restoreOffloadedBody(webhookResponse, {
				reclaim: true,
				context: { workflowId: workflow.id, executionId },
			});
			return Buffer.isBuffer(body)
				? { ...base, output: null, outputTruncated: true }
				: { ...base, output: body };
		}

		// `collectResultData` keys the last node's items by its name; the app only wants the items.
		const output = result.data ? Object.values(result.data)[0] : [];
		return { ...base, output };
	}

	/** The slot is held while the call blocks on the run; a 202 releases it although the run goes on. */
	private async holdRun<T>(runAndWait: () => Promise<T>): Promise<T> {
		const max = this.appsConfig.runtimeMaxConcurrent;
		if (max > 0 && this.inFlight >= max) {
			throw new AppRuntimeError(
				429,
				'too_many_requests',
				'Too many workflow runs are in progress. Try again in a moment.',
			);
		}
		this.inFlight++;
		try {
			return await runAndWait();
		} finally {
			this.inFlight--;
		}
	}

	/** `undefined` when the execution already left the active set (e.g. it failed before starting). */
	private async waitForRun(executionId: string): Promise<IRun | 'running' | undefined> {
		if (!this.activeExecutions.has(executionId)) return undefined;

		let timeoutId: NodeJS.Timeout | undefined;
		const timeout = new Promise<'running'>((resolve) => {
			timeoutId = setTimeout(() => resolve('running'), SYNC_WAIT_MS);
		});
		try {
			return await Promise.race([
				this.activeExecutions.getPostExecutePromise(executionId),
				timeout,
			]);
		} finally {
			clearTimeout(timeoutId);
		}
	}
}
