import {
	getWorkflowToolIncompatibilityReason,
	type AppDescribedWorkflowBinding,
	type AppJsonSchema,
	type AppWorkflowBinding,
	type AppWorkflowRunResult,
	type AppWorkflowRunStatus,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import {
	AppRuntimeError,
	AppsConfig,
	AppWorkflowPort,
	type AppCallContext,
	type AppVisitor,
} from '@n8n/backend-module-apps';
import { GlobalConfig } from '@n8n/config';
import type { User, WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, NotFoundError } from '@n8n/errors';
import { isRecord } from '@n8n/utils/is-record';
import {
	createRunExecutionData,
	type IDataObject,
	type INode,
	type IPinData,
	type IRun,
	type IRunExecutionData,
	type IWorkflowExecutionDataProcess,
} from 'n8n-workflow';
import { createHash } from 'node:crypto';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { ActiveExecutions } from '@/active-executions';
import { SubworkflowPolicyDenialError } from '@/errors/subworkflow-policy-denial.error';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import { SubworkflowPolicyChecker } from '@/executions/pre-execution-checks';
import {
	detectTriggerNode,
	formatResult,
	inferInputSchema,
	listWorkflowInputFields,
	validateCompatibility,
} from '@/modules/agents/tools/workflow-tool-factory';
import { WorkflowToolUnavailableError } from '@/modules/agents/tools/workflow-tool-unavailable-error';
import { WorkflowToolWorkflowLoader } from '@/modules/agents/tools/workflow-tool-workflow-loader.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowRunner } from '@/workflow-runner';

import { inferOutputSchema, sampleOutputItems, UNKNOWN_OUTPUT_SCHEMA } from './infer-output-schema';

/** The only node whose error text is written for the workflow's users, so it can reach them. */
const STOP_AND_ERROR_NODE_TYPE = 'n8n-nodes-base.stopAndError';
const GENERIC_FAILURE_MESSAGE = 'The workflow failed.';
const PASSTHROUGH_INPUT_SCHEMA: AppJsonSchema = { type: 'object', additionalProperties: true };

/** Execution metadata keys. They identify app traffic and the visitor who started a run. */
const META_APP_ID = 'appId';
const META_BINDING_KEY = 'appBindingKey';
const META_VISITOR = 'appVisitor';

const RUN_STATUSES: readonly string[] = [
	'success',
	'error',
	'waiting',
	'canceled',
	'running',
	'unknown',
] satisfies AppWorkflowRunStatus[];

function isRunStatus(status: string): status is AppWorkflowRunStatus {
	return RUN_STATUSES.includes(status);
}

/** Stores a hash for anonymous visitors, so the raw cookie value never reaches the database. */
function visitorTag(visitor: AppVisitor): string {
	return visitor.type === 'user'
		? `user:${visitor.userId}`
		: `anonymous:${createHash('sha256').update(visitor.id).digest('hex')}`;
}

function isDataObject(value: unknown): value is IDataObject {
	return isRecord(value);
}

/** Workflow runs for app bindings. Runs act as the app project, like an agent workflow tool. */
@Service()
export class AppWorkflowAdapter extends AppWorkflowPort {
	/** `integrated` runs skip the instance concurrency queue, so app runs need their own cap. */
	private inFlight = 0;

	constructor(
		private readonly workflowLoader: WorkflowToolWorkflowLoader,
		private readonly workflowFinder: WorkflowFinderService,
		private readonly subworkflowPolicyChecker: SubworkflowPolicyChecker,
		private readonly workflowRunner: WorkflowRunner,
		private readonly activeExecutions: ActiveExecutions,
		private readonly executionPersistence: ExecutionPersistence,
		private readonly appsConfig: AppsConfig,
		private readonly globalConfig: GlobalConfig,
		private readonly logger: Logger,
	) {
		super();
	}

	async assertCanBind(user: User, projectId: string, binding: AppWorkflowBinding) {
		const workflow = await this.workflowFinder.findWorkflowForUser(binding.workflowId, user, [
			'workflow:execute',
		]);
		if (!workflow) {
			throw new NotFoundError(
				`Binding "${binding.key}": you cannot run workflow "${binding.workflowId}".`,
			);
		}
		const ownerProjectId = workflow.shared.find((s) => s.role === 'workflow:owner')?.projectId;
		if (ownerProjectId !== projectId) {
			throw new BadRequestError(
				`Binding "${binding.key}": workflow "${workflow.name}" must be in the app project.`,
			);
		}
		const incompatibility = getWorkflowToolIncompatibilityReason(workflow);
		if (incompatibility) {
			throw new BadRequestError(
				`Binding "${binding.key}": workflow "${workflow.name}" cannot run from an app (${incompatibility.reason}).`,
			);
		}
	}

	async describe(
		projectId: string,
		binding: AppWorkflowBinding,
	): Promise<AppDescribedWorkflowBinding | null> {
		const loaded = await this.loadForDescribe(projectId, binding.workflowId);
		if (!loaded || getWorkflowToolIncompatibilityReason(loaded.workflow) !== null) return null;
		const { workflow, published } = loaded;
		const trigger = detectTriggerNode(workflow);
		const passthrough = listWorkflowInputFields(trigger.node).length === 0;
		return {
			...binding,
			name: workflow.name,
			published,
			input: passthrough
				? PASSTHROUGH_INPUT_SCHEMA
				: this.inputJsonSchema(trigger.node, trigger.triggerType),
			output: await this.inferOutput(workflow.id),
		};
	}

	async run(
		ctx: AppCallContext,
		workflowId: string,
		input: unknown,
	): Promise<AppWorkflowRunResult> {
		const workflow = await this.loadPublished(ctx.projectId, workflowId);

		try {
			validateCompatibility(workflow);
		} catch (error) {
			if (error instanceof WorkflowToolUnavailableError) {
				// The original message names the nodes of a private workflow.
				throw new AppRuntimeError(
					409,
					'workflow_incompatible',
					'The bound workflow cannot run from an app. Check its trigger and nodes in n8n.',
				);
			}
			throw error;
		}

		try {
			await this.subworkflowPolicyChecker.checkForProject(workflow, ctx.projectId);
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
		const parsed = inferInputSchema(trigger.node, trigger.triggerType).safeParse(input);
		if (!parsed.success || !isDataObject(parsed.data)) {
			throw AppRuntimeError.invalidInput(
				'The request body does not match the workflow inputs.',
				parsed.success ? undefined : parsed.error,
			);
		}

		return await this.execute(ctx, workflow, trigger.node, parsed.data);
	}

	async getRun(
		ctx: AppCallContext,
		workflowId: string,
		executionId: string,
	): Promise<AppWorkflowRunResult> {
		const notFound = new AppRuntimeError(404, 'run_not_found', 'The run was not found.');
		if (!/^\d+$/.test(executionId)) throw notFound;
		const execution = await this.executionPersistence.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});
		const metadata = execution?.data?.resultData?.metadata;
		if (
			!execution ||
			execution.workflowId !== workflowId ||
			metadata?.[META_APP_ID] !== ctx.appId ||
			metadata?.[META_BINDING_KEY] !== ctx.bindingKey ||
			metadata?.[META_VISITOR] !== visitorTag(ctx.visitor)
		) {
			throw notFound;
		}
		if (execution.status === 'running' || execution.status === 'new') {
			return { executionId, status: 'running' };
		}
		return this.toRunResult(
			ctx,
			executionId,
			execution.status,
			execution.data,
			execution.workflowData.nodes,
		);
	}

	private async execute(
		ctx: AppCallContext,
		workflow: WorkflowEntity,
		triggerNode: INode,
		input: IDataObject,
	): Promise<AppWorkflowRunResult> {
		const pinData: IPinData = { [triggerNode.name]: [{ json: input }] };
		const runData: IWorkflowExecutionDataProcess = {
			executionMode: 'integrated',
			workflowData: {
				...workflow,
				// `getRun` reads the result from the execution row, so it must outlive pruning-on-finish.
				settings: {
					...workflow.settings,
					saveDataSuccessExecution: 'all',
					saveDataErrorExecution: 'all',
				},
			},
			startNodes: [{ name: triggerNode.name, sourceData: null }],
			pinData,
			executionData: createRunExecutionData({
				startData: {},
				resultData: {
					pinData,
					runData: {},
					metadata: {
						[META_APP_ID]: ctx.appId,
						[META_BINDING_KEY]: ctx.bindingKey,
						[META_VISITOR]: visitorTag(ctx.visitor),
					},
				},
				executionData: {
					contextData: {},
					metadata: {},
					nodeExecutionStack: [
						{ node: triggerNode, data: { main: [pinData[triggerNode.name]] }, source: null },
					],
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			}),
		};

		const { executionId, run } = await this.holdRun(async () => {
			const executionId = await this.workflowRunner.run(runData);
			return { executionId, run: await this.waitForRun(executionId) };
		});
		if (run === 'running') return { executionId, status: 'running' };

		const execution =
			run ??
			(await this.executionPersistence.findSingleExecution(executionId, {
				includeData: true,
				unflattenData: true,
			}));
		if (!execution) return { executionId, status: 'unknown', output: [] };

		return this.toRunResult(ctx, executionId, execution.status, execution.data, workflow.nodes);
	}

	private toRunResult(
		ctx: AppCallContext,
		executionId: string,
		status: string | undefined,
		data: IRunExecutionData | undefined,
		nodes: INode[],
	): AppWorkflowRunResult {
		const result = formatResult(executionId, status, data, false);
		const runStatus = isRunStatus(result.status) ? result.status : 'unknown';
		if (runStatus === 'success') {
			// The last node's items, keyed by its name.
			const output = result.data ? Object.values(result.data)[0] : [];
			return { executionId, status: runStatus, output };
		}

		// The raw error can name hosts, tables, and credentials of a private workflow.
		this.logger.warn('App workflow run did not succeed.', {
			appId: ctx.appId,
			bindingKey: ctx.bindingKey,
			executionId,
			status: runStatus,
			error: result.error,
		});
		const failure: AppWorkflowRunResult = { executionId, status: runStatus, output: [] };
		if (runStatus !== 'error') return failure;
		const failedNode = nodes.find((node) => node.name === data?.resultData.lastNodeExecuted);
		const error =
			failedNode?.type === STOP_AND_ERROR_NODE_TYPE && result.error
				? result.error
				: GENERIC_FAILURE_MESSAGE;
		return { ...failure, error };
	}

	private async loadPublished(projectId: string, workflowId: string): Promise<WorkflowEntity> {
		try {
			const workflow = await this.workflowLoader.loadWorkflow(
				projectId,
				{ workflowId, workflowName: '' },
				{ usePublishedVersion: true },
			);
			if (!workflow) {
				throw new AppRuntimeError(
					404,
					'resource_missing',
					'The bound workflow is no longer in the app project.',
				);
			}
			return workflow;
		} catch (error) {
			if (error instanceof WorkflowToolUnavailableError && error.reason === 'not_published') {
				throw new AppRuntimeError(
					409,
					'workflow_not_published',
					'The bound workflow is not published. Publish it so the app can run it.',
				);
			}
			throw error;
		}
	}

	/** Uses the runtime loader, so describe sees the nodes that a run uses. */
	private async loadForDescribe(
		projectId: string,
		workflowId: string,
	): Promise<{ workflow: WorkflowEntity; published: boolean } | null> {
		const reference = { workflowId, workflowName: '' };
		try {
			const workflow = await this.workflowLoader.loadWorkflow(projectId, reference, {
				usePublishedVersion: true,
			});
			return workflow && { workflow, published: true };
		} catch (error) {
			if (!(error instanceof WorkflowToolUnavailableError) || error.reason !== 'not_published') {
				throw error;
			}
			const draft = await this.workflowLoader.loadWorkflow(projectId, reference);
			return draft && { workflow: draft, published: false };
		}
	}

	private inputJsonSchema(triggerNode: INode, triggerType: string): AppJsonSchema {
		const generated: unknown = zodToJsonSchema(inferInputSchema(triggerNode, triggerType));
		if (!isRecord(generated)) return PASSTHROUGH_INPUT_SCHEMA;
		const { type, properties, required, additionalProperties } = generated;
		return { type, properties, ...(required ? { required } : {}), additionalProperties };
	}

	/**
	 * Only key names and types leave `inferOutputSchema`, never values. The workflow
	 * is already confirmed to be in the app project, so the workflow ID scopes the query.
	 */
	private async inferOutput(workflowId: string): Promise<AppJsonSchema> {
		const [execution] = await this.executionPersistence.findMultipleExecutions(
			{
				select: ['id', 'mode', 'startedAt', 'stoppedAt', 'workflowId', 'jsonSizeBytes'],
				where: { workflowId, status: 'success' },
				order: { id: 'DESC' },
				take: 1,
			},
			{
				includeData: true,
				unflattenData: true,
				maxDataSizeBytes: this.globalConfig.executions.maxDisplaySize,
			},
		);
		return (
			(execution && inferOutputSchema(sampleOutputItems(execution.data))) ?? UNKNOWN_OUTPUT_SCHEMA
		);
	}

	private async holdRun<T>(runAndWait: () => Promise<T>): Promise<T> {
		const max = this.appsConfig.apiMaxConcurrentRuns;
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

	/** Returns `undefined` when the execution already left the active set. */
	private async waitForRun(executionId: string): Promise<IRun | 'running' | undefined> {
		if (!this.activeExecutions.has(executionId)) return undefined;

		let timeoutId: NodeJS.Timeout | undefined;
		const timeout = new Promise<'running'>((resolve) => {
			timeoutId = setTimeout(() => resolve('running'), this.appsConfig.apiRunWaitMs);
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
