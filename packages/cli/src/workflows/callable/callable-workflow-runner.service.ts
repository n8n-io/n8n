import { zodSchemaToJsonSchema } from '@n8n/ai-utilities/json-schema';
import { getWorkflowToolIncompatibilityReason } from '@n8n/api-types';
import { WorkflowsConfig } from '@n8n/config';
import type { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import type { DistributiveOmit } from '@n8n/utils/types';
import {
	createRunExecutionData,
	type IDataObject,
	type INode,
	type IPinData,
	type IRun,
	type IRunExecutionData,
	type IWorkflowExecutionDataProcess,
} from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';
import { SubworkflowPolicyDenialError } from '@/errors/subworkflow-policy-denial.error';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import { SubworkflowPolicyChecker } from '@/executions/pre-execution-checks';
import { WorkflowRunner } from '@/workflow-runner';

import {
	detectTriggerNode,
	inferInputSchema,
	listWorkflowInputFields,
} from './callable-workflow-input';
import { CallableWorkflowLoader } from './callable-workflow-loader.service';
import { collectResultData, normaliseExecutionStatus } from './callable-workflow-result';
import { CallableWorkflowUnavailableError } from './callable-workflow-unavailable.error';

/**
 * Why a workflow cannot run as a tool of a project:
 * - `not_found`: the project does not own the workflow, or it is archived.
 * - `not_published`: the workflow has no published version.
 * - `no_supported_trigger`: it has no trigger "When Executed by Another Workflow".
 * - `incompatible_nodes`: the trigger reaches a node that cannot run as a tool.
 * - `not_callable`: its sub-workflow policy does not allow calls from the project.
 */
export type CallableWorkflowRefusal =
	| 'not_found'
	| 'not_published'
	| 'no_supported_trigger'
	| 'incompatible_nodes'
	| 'not_callable';

type CallableTrigger = ReturnType<typeof detectTriggerNode>;

export type CallableWorkflowCheck =
	| { callable: true }
	| { callable: false; reason: CallableWorkflowRefusal };

/** A JSON schema of the tool input. It always describes an object. */
export interface CallableWorkflowInputSchema {
	type: 'object';
	properties?: Record<string, unknown>;
	required?: string[];
	additionalProperties: boolean | Record<string, unknown>;
}

export type CallableWorkflowDescription =
	| {
			callable: true;
			name: string;
			description: string | null;
			inputSchema: CallableWorkflowInputSchema;
			/** The node names of the published version. */
			nodeNames: string[];
	  }
	| { callable: false; reason: CallableWorkflowRefusal };

export interface CallableWorkflowRunOptions {
	/** How long the call waits for the run, in milliseconds. After that the run goes on, and the result has status `running`. */
	waitMs: number;
}

export type CallableWorkflowRunStatus = 'running' | 'waiting' | 'canceled' | 'unknown';

/** A run that started. */
export type CallableWorkflowStartedRun = {
	executionId: string;
	/**
	 * Settles when the execution finishes, also after the wait ended. A caller
	 * with its own run cap holds its slot until then. A run that reaches a Wait
	 * node settles it too, and the part that resumes later is not counted.
	 */
	finished: Promise<void>;
} & (
	| { status: 'success'; output: unknown[] }
	| {
			status: 'error';
			/** The raw error of the run. It can name hosts and tables, so the caller decides who sees it. */
			error: { message: string; nodeType?: string };
	  }
	| { status: CallableWorkflowRunStatus }
);

export type CallableWorkflowRunResult =
	| { status: 'refused'; reason: CallableWorkflowRefusal }
	| { status: 'invalid_input'; message: string }
	/** The instance limit of concurrent runs is full. */
	| { status: 'busy' }
	| CallableWorkflowStartedRun;

/** A workflow without declared inputs takes any object. */
const OPEN_INPUT_SCHEMA: CallableWorkflowInputSchema = {
	type: 'object',
	additionalProperties: true,
};

/**
 * Loads, checks, describes, and runs the published version of a project
 * workflow that another feature calls as a tool, such as a custom MCP server.
 *
 * `AppWorkflowAdapter` keeps its own copy of this path in the MVP, with its own
 * run cap. The copies differ: here a stop during the wait gives `canceled` and
 * a run checks that the project owns the workflow. Apps throws on a stop and
 * checks the owner only when it binds the workflow. Move Apps onto this runner
 * after the MVP.
 */
@Service()
export class CallableWorkflowRunner {
	/**
	 * Executions that this service started and that still run. `integrated`
	 * runs skip the instance concurrency queue, so they need their own cap.
	 */
	private inFlight = 0;

	constructor(
		private readonly workflowLoader: CallableWorkflowLoader,
		private readonly subworkflowPolicyChecker: SubworkflowPolicyChecker,
		private readonly workflowRunner: WorkflowRunner,
		private readonly activeExecutions: ActiveExecutions,
		private readonly executionPersistence: ExecutionPersistence,
		private readonly workflowsConfig: WorkflowsConfig,
	) {}

	async check(projectId: string, workflowId: string): Promise<CallableWorkflowCheck> {
		const checked = await this.load(projectId, workflowId, { preview: true });
		// The entity stays in the runner, so a caller cannot hand it to its module.
		return 'reason' in checked ? { callable: false, reason: checked.reason } : { callable: true };
	}

	/** The name and the description are not versioned. The inputs come from the published version. */
	async describe(projectId: string, workflowId: string): Promise<CallableWorkflowDescription> {
		const checked = await this.load(projectId, workflowId, { preview: true });
		if ('reason' in checked) return { callable: false, reason: checked.reason };
		const { workflow, trigger } = checked;
		return {
			callable: true,
			name: workflow.name,
			description: workflow.description ?? null,
			inputSchema: toInputJsonSchema(trigger),
			nodeNames: workflow.nodes.map((node) => node.name),
		};
	}

	/**
	 * Runs the published version as the project, in the mode `integrated`. In
	 * queue mode, a worker runs it. The workflow uses its own credentials.
	 */
	async run(
		projectId: string,
		workflowId: string,
		input: unknown,
		options: CallableWorkflowRunOptions,
	): Promise<CallableWorkflowRunResult> {
		const checked = await this.load(projectId, workflowId, { preview: false });
		if ('reason' in checked) return { status: 'refused', reason: checked.reason };
		const { workflow, trigger } = checked;

		const parsed = inferInputSchema(trigger.node, trigger.triggerType).safeParse(input);
		if (!parsed.success) {
			const message = parsed.error.issues
				.map((issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`)
				.join('; ');
			return { status: 'invalid_input', message };
		}

		const release = this.claimRunSlot();
		if (!release) return { status: 'busy' };
		let executionId: string;
		try {
			executionId = await this.workflowRunner.run(
				toRunData(workflow, projectId, trigger.node, parsed.data),
			);
		} catch (error) {
			release();
			throw error;
		}
		const finished = this.whenFinished(executionId).finally(release);

		const run = await this.waitForRun(executionId, options.waitMs);
		if (run === 'running' || run === 'canceled') return { status: run, executionId, finished };

		const execution =
			run ??
			(await this.executionPersistence.findSingleExecution(executionId, {
				includeData: true,
				unflattenData: true,
			}));
		if (!execution) return { status: 'unknown', executionId, finished };
		return {
			...toRunOutcome(execution.status, execution.data, workflow.nodes),
			executionId,
			finished,
		};
	}

	/** Returns a release function, or `null` when the limit is full. */
	private claimRunSlot(): (() => void) | null {
		const max = this.workflowsConfig.callableMaxConcurrentRuns;
		if (max !== -1 && this.inFlight >= max) return null;
		this.inFlight++;
		return () => {
			this.inFlight--;
		};
	}

	/** The slot belongs to the execution, not to the call, which can stop waiting first. */
	private async whenFinished(executionId: string): Promise<void> {
		if (!this.activeExecutions.has(executionId)) return;
		await this.activeExecutions.getPostExecutePromise(executionId).catch(() => {});
	}

	/**
	 * Returns `undefined` when the execution already left the active set.
	 * A stop rejects the post-execute promise, so a rejection means `canceled`.
	 */
	private async waitForRun(
		executionId: string,
		waitMs: number,
	): Promise<IRun | 'running' | 'canceled' | undefined> {
		if (!this.activeExecutions.has(executionId)) return undefined;

		let timeoutId: NodeJS.Timeout | undefined;
		const timeout = new Promise<'running'>((resolve) => {
			timeoutId = setTimeout(() => resolve('running'), waitMs);
		});
		try {
			return await Promise.race([
				this.activeExecutions.getPostExecutePromise(executionId).catch(() => 'canceled' as const),
				timeout,
			]);
		} finally {
			clearTimeout(timeoutId);
		}
	}

	/**
	 * Loads the published version and runs every check that does not need the input. A preview
	 * (`check`, `describe`) does not log a policy denial, because nothing runs.
	 */
	private async load(
		projectId: string,
		workflowId: string,
		{ preview }: { preview: boolean },
	): Promise<
		{ workflow: WorkflowEntity; trigger: CallableTrigger } | { reason: CallableWorkflowRefusal }
	> {
		let workflow: WorkflowEntity | null;
		try {
			workflow = await this.workflowLoader.loadWorkflow(
				projectId,
				{ workflowId, workflowName: '' },
				{ usePublishedVersion: true },
			);
		} catch (error) {
			if (!(error instanceof CallableWorkflowUnavailableError)) throw error;
			if (error.reason !== 'not_published') return { reason: 'not_found' };
			// Ownership comes first, so only a workflow of the project reports "not published".
			const draft = await this.workflowLoader.loadWorkflow(projectId, {
				workflowId,
				workflowName: '',
			});
			return { reason: draft && isOwnedBy(draft, projectId) ? 'not_published' : 'not_found' };
		}
		if (!workflow || !isOwnedBy(workflow, projectId)) return { reason: 'not_found' };

		const incompatibility = getWorkflowToolIncompatibilityReason(workflow);
		if (incompatibility) return { reason: incompatibility.reason };

		if (preview) {
			if (!(await this.subworkflowPolicyChecker.isCallableByProject(workflow, projectId))) {
				return { reason: 'not_callable' };
			}
		} else {
			try {
				await this.subworkflowPolicyChecker.checkForProject(workflow, projectId);
			} catch (error) {
				if (error instanceof SubworkflowPolicyDenialError) return { reason: 'not_callable' };
				throw error;
			}
		}

		return { workflow, trigger: detectTriggerNode(workflow) };
	}
}

function toInputJsonSchema(trigger: CallableTrigger): CallableWorkflowInputSchema {
	if (listWorkflowInputFields(trigger.node).length === 0) return OPEN_INPUT_SCHEMA;
	const generated: unknown = zodSchemaToJsonSchema(
		inferInputSchema(trigger.node, trigger.triggerType),
	);
	if (!isRecord(generated) || !isRecord(generated.properties)) return OPEN_INPUT_SCHEMA;
	const { properties, required, additionalProperties } = generated;
	return {
		type: 'object',
		properties,
		...(Array.isArray(required) && required.length > 0 ? { required: required.map(String) } : {}),
		additionalProperties:
			typeof additionalProperties === 'boolean' || isRecord(additionalProperties)
				? additionalProperties
				: true,
	};
}

function toRunData(
	workflow: WorkflowEntity,
	projectId: string,
	triggerNode: INode,
	input: IDataObject,
): IWorkflowExecutionDataProcess {
	const pinData: IPinData = { [triggerNode.name]: [{ json: input }] };
	return {
		executionMode: 'integrated',
		// Queue mode sends the job to the worker pool of the project, and lifecycle events name it.
		projectId,
		// The owner's save settings stay. A failed run that is not saved and that ends before the
		// wait reads back as `unknown`.
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
					{ node: triggerNode, data: { main: [pinData[triggerNode.name]] }, source: null },
				],
				waitingExecution: {},
				waitingExecutionSource: {},
			},
		}),
	};
}

const RUN_STATUSES: readonly string[] = [
	'running',
	'waiting',
	'canceled',
	'unknown',
] satisfies CallableWorkflowRunStatus[];

function isRunStatus(status: string): status is CallableWorkflowRunStatus {
	return RUN_STATUSES.includes(status);
}

type RunOutcome = DistributiveOmit<CallableWorkflowStartedRun, 'executionId' | 'finished'>;

function toRunOutcome(
	status: string | undefined,
	data: IRunExecutionData | undefined,
	nodes: INode[],
): RunOutcome {
	const normalised = normaliseExecutionStatus(status);
	if (normalised === 'success') {
		// The items of the node that ran last, from all of its main outputs. In a loop, that node
		// is not always the last key of `runData`.
		const runData = data?.resultData?.runData;
		const lastNode = data?.resultData?.lastNodeExecuted;
		const source =
			runData && lastNode && runData[lastNode] ? { [lastNode]: runData[lastNode] } : runData;
		const lastNodeItems = source ? Object.values(collectResultData(source, false))[0] : undefined;
		return { status: 'success', output: Array.isArray(lastNodeItems) ? lastNodeItems : [] };
	}
	if (normalised === 'error') {
		const failedNode = nodes.find((node) => node.name === data?.resultData?.lastNodeExecuted);
		return {
			status: 'error',
			error: {
				message: data?.resultData?.error?.message ?? 'The workflow failed.',
				...(failedNode ? { nodeType: failedNode.type } : {}),
			},
		};
	}
	return { status: isRunStatus(normalised) ? normalised : 'unknown' };
}

/** The loader also finds workflows that are only shared with the project. */
function isOwnedBy(workflow: WorkflowEntity, projectId: string): boolean {
	return (
		workflow.shared?.some((s) => s.role === 'workflow:owner' && s.projectId === projectId) ?? false
	);
}
