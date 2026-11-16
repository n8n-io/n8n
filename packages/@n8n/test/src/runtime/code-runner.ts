import { UnexpectedError } from '@n8n/errors';
import type {
	BrokerMessage,
	DataRequestResponse,
	JsTaskRunner,
	RunnerMessage,
	TaskData,
	TaskDataRequestParams,
	TaskResultData,
} from '@n8n/task-runner';
import { createResultError, createResultOk, type Result } from '@n8n/utils/result';
import { isSerializedBuffer, serializeBuffer, toBuffer } from 'n8n-core';
import type {
	IDataObject,
	INodeTypeDescription,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';
import { Worker } from 'node:worker_threads';

import { WorkflowTestError } from '../errors';
import { failExecution, type ExecutionSetup } from '../execution-context';
import { toDataResponse } from './runner-data';

type RunnerTaskArgs = Parameters<IWorkflowExecuteAdditionalData['startRunnerTask']>;

type RunnerRpc = RunnerMessage.ToBroker.RPC;

type TaskOutcome = { done: string } | { error: string } | { stopped: string };

interface HostedTask {
	data: TaskData;
	variables: IDataObject;
	settle: (outcome: TaskOutcome) => void;
}

const RUNNER_CONFIG: ConstructorParameters<typeof JsTaskRunner>[0] = {
	baseRunnerConfig: {
		taskBrokerUri: 'http://127.0.0.1:5679',
		grantToken: '',
		runnerId: '',
		maxPayloadSize: 1024 * 1024 * 1024,
		maxConcurrency: 10,
		idleTimeout: 0,
		gracefulShutdownTimeout: 30,
		shutdownForceKillMargin: 10,
		timezone: 'America/New_York',
		taskTimeout: 300,
		healthcheckServer: { enabled: false, host: '127.0.0.1', port: 5681 },
	},
	jsRunnerConfig: { allowedBuiltInModules: '', allowedExternalModules: '', insecureMode: false },
	sentryConfig: {
		dsn: '',
		deploymentName: '',
		environment: '',
		n8nVersion: '',
		profilingEnabled: false,
		tracesSampleRate: 0,
	},
};

const WORKER_SOURCE = `
const { createRequire } = require('node:module');
const { parentPort, workerData } = require('node:worker_threads');
const { JsTaskRunner } = require(workerData.runnerPath);
const fromRunner = createRequire(workerData.runnerPath);
const { Settings } = createRequire(fromRunner.resolve('n8n-workflow'))('luxon');
process.on('unhandledRejection', () => console.warn('Unhandled promise rejection in task runner, continuing.'));
const runner = new JsTaskRunner(workerData.config);
runner.send = (message) => parentPort.postMessage(JSON.stringify(message));
parentPort.on('message', (sent) => {
	const message = JSON.parse(sent);
	if (message.type === 'test:clock') {
		Settings.now = message.now === null ? () => Date.now() : () => message.now;
		return;
	}
	if (message.type === 'broker:taskofferaccept') {
		runner.openOffers.set(message.offerId, { offerId: message.offerId, validUntil: process.hrtime.bigint() + 60000000000n });
	}
	runner.onMessage(message);
});
`;

class WorkerBroker {
	private readonly hosted = new Map<string, HostedTask>();

	private readonly worker = new Worker(WORKER_SOURCE, {
		eval: true,
		env: {},
		workerData: { runnerPath: require.resolve('@n8n/task-runner'), config: RUNNER_CONFIG },
	});

	private taskCount = 0;

	constructor() {
		this.worker.unref();
		this.worker.on('message', (sent: string) =>
			this.onRunnerMessage(jsonParse<RunnerMessage.ToBroker.All>(sent)),
		);
		this.worker.on('error', (error) => this.stop(error.message));
		this.worker.on('exit', (code) => this.stop(`exit code ${code}`));
	}

	async runTask(task: Omit<HostedTask, 'settle'>, settings: unknown, now: number | null) {
		this.taskCount += 1;
		const taskId = `test-task-${this.taskCount}`;
		const outcome = new Promise<TaskOutcome>((settle) =>
			this.hosted.set(taskId, { ...task, settle }),
		);
		this.worker.postMessage(JSON.stringify({ type: 'test:clock', now }));
		this.send({ type: 'broker:taskofferaccept', offerId: taskId, taskId });
		this.send({ type: 'broker:tasksettings', taskId, settings });
		try {
			return await outcome;
		} finally {
			this.hosted.delete(taskId);
		}
	}

	private stop(reason: string) {
		if (broker === this) broker = undefined;
		for (const task of this.hosted.values()) task.settle({ stopped: reason });
	}

	private onRunnerMessage(message: RunnerMessage.ToBroker.All) {
		if (!('taskId' in message)) return;
		const task = this.hosted.get(message.taskId);
		if (!task) return;

		switch (message.type) {
			case 'runner:taskdone':
				return task.settle({ done: JSON.stringify(message.data) });
			case 'runner:taskerror':
				return task.settle({ error: JSON.stringify(message.error) });
			case 'runner:taskdatarequest':
				return this.send({
					type: 'broker:taskdataresponse',
					taskId: message.taskId,
					requestId: message.requestId,
					data: toDataResponseWithVariables(task, message.requestParams),
				});
			case 'runner:nodetypesrequest':
				return this.send({
					type: 'broker:nodetypes',
					taskId: message.taskId,
					requestId: message.requestId,
					nodeTypes: message.requestParams.map(({ name, version }) =>
						toRunnerDescription(
							task.data.workflow.nodeTypes.getByNameAndVersion(name, version).description,
						),
					),
				});
			case 'runner:rpc':
				this.answerRpc(task.data, message);
				return;
		}
	}

	private send(message: BrokerMessage.ToRunner.All) {
		this.worker.postMessage(JSON.stringify(message));
	}

	private answerRpc({ executeFunctions }: TaskData, { taskId, callId, name, params }: RunnerRpc) {
		const respond = (status: 'success' | 'error', data: unknown) =>
			this.send({ type: 'broker:rpcresponse', taskId, callId, status, data });
		const method = findMethod(executeFunctions, name.split('.'));
		if (typeof method !== 'function') return respond('error', 'Could not find method');
		const args = params.map((param) => (isSerializedBuffer(param) ? toBuffer(param) : param));
		Promise.resolve()
			.then((): unknown => Reflect.apply(method, executeFunctions, args))
			.then(
				(data) => respond('success', Buffer.isBuffer(data) ? serializeBuffer(data) : data),
				(error: unknown) => respond('error', error),
			);
	}
}

function toDataResponseWithVariables(
	{ data, variables }: HostedTask,
	params: TaskDataRequestParams,
): DataRequestResponse {
	const response = toDataResponse(data, params);
	return { ...response, additionalData: { ...response.additionalData, variables } };
}

function suppliedVariables({ options }: ExecutionSetup): IDataObject {
	return Object.fromEntries(
		Object.entries(options.variables ?? {}).filter(([, value]) => value !== null),
	);
}

function toRunnerDescription(description: INodeTypeDescription): INodeTypeDescription {
	const { name } = description;
	return { ...description, name: name.startsWith('n8n-nodes') ? name : `n8n-nodes-base.${name}` };
}

function findMethod(target: object, path: string[]): unknown {
	let current: unknown = target;
	for (const part of path) {
		if (typeof current !== 'object' || current === null) return undefined;
		current = Reflect.get(current, part);
	}
	return current;
}

let broker: WorkerBroker | undefined;

export async function startRunnerTask<T, E>(
	context: ExecutionSetup,
	args: RunnerTaskArgs,
): Promise<Result<T, E>> {
	const [, jobType, settings] = args;
	const data = toTaskData(args);
	if (jobType !== 'javascript') {
		throw new UnexpectedError(`Node "${data.node.name}" started a ${jobType} task`);
	}
	broker ??= new WorkerBroker();
	const { now } = context.options;
	const outcome = await broker.runTask(
		{ data, variables: suppliedVariables(context) },
		settings,
		now === undefined ? null : new Date(now).getTime(),
	);
	if ('stopped' in outcome) return failExecution(context, runnerStopped(context, data, outcome));
	if ('error' in outcome) return createResultError(jsonParse<E>(outcome.error));

	const result = jsonParse<TaskResultData & { result: T }>(outcome.done);
	const { runExecutionData, workflow } = data;
	if (result.customData) {
		runExecutionData.resultData.metadata = {
			...runExecutionData.resultData.metadata,
			...result.customData,
		};
	}
	if (result.staticData) workflow.overrideStaticData(result.staticData);
	return createResultOk(result.result);
}

function runnerStopped(
	{ handle }: ExecutionSetup,
	{ node }: TaskData,
	{ stopped }: { stopped: string },
) {
	return new WorkflowTestError(
		'NODE_FAILED',
		`Node "${node.name}" failed because the Code node runner stopped (${stopped}). The next Code node starts a new runner.`,
		{ workflow: handle.name, node: node.name },
	);
}

function toTaskData([
	additionalData,
	,
	,
	executeFunctions,
	inputData,
	node,
	workflow,
	runExecutionData,
	runIndex,
	itemIndex,
	activeNodeName,
	connectionInputData,
	siblingParameters,
	mode,
	envProviderState,
	executeData,
]: RunnerTaskArgs): TaskData {
	return {
		workflow,
		runExecutionData,
		runIndex,
		connectionInputData,
		inputData,
		node,
		executeFunctions,
		itemIndex,
		siblingParameters,
		mode,
		envProviderState,
		executeData,
		defaultReturnRunIndex: -1,
		selfData: {},
		contextNodeName: activeNodeName,
		activeNodeName,
		additionalData: { ...additionalData, variables: {} },
	};
}
