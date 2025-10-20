import { Container } from '@n8n/di';
import { WorkflowExecute } from 'n8n-core';
import { Workflow } from 'n8n-workflow';
import { parentPort } from 'worker_threads';

import { getLifecycleHooksForRegularMain } from '@/execution-lifecycle/execution-lifecycle-hooks';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { NodeTypes } from '@/node-types';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';

import type { WorkerMessage } from './worker-types';

let nodeTypes: NodeTypes;

// let debugIsActive = false;
const prefix = '[w]:';

parentPort?.on('message', async (msg: WorkerMessage) => {
	// if (!debugIsActive) {
	// 	debugIsActive = true;
	// 	inspector.open();
	// 	inspector.waitForDebugger();
	// }
	try {
		// console.log(prefix, 'got message:', msg);

		// reportMemory();

		if (!nodeTypes) {
			nodeTypes = Container.get(NodeTypes);
			const loadNodesAndCredentials = Container.get(LoadNodesAndCredentials);

			await loadNodesAndCredentials.init();
		}

		if (msg.type === 'ping') {
			parentPort?.postMessage({ type: 'pong' });
		} else if (msg.type === 'execute') {
			console.log(prefix, 'execute message received');
			const workflowData = msg.workflow;
			const executionId = msg.executionId;

			const workflow = new Workflow({
				id: workflowData.id,
				name: workflowData.name,
				nodes: workflowData.nodes,
				connections: workflowData.connections,
				active: workflowData.active,
				nodeTypes,
				staticData: undefined,
				settings: workflowData.settings,
			});

			const additionalData = await WorkflowExecuteAdditionalData.getBase({});

			const lifecycleHooks = getLifecycleHooksForRegularMain(
				{
					executionMode: msg.executionMode,
					workflowData,
					// TODO: don't hard code
					retryOf: null,
					// TODO: support push refs
					pushRef: undefined,
				},
				executionId,
			);
			additionalData.hooks = lifecycleHooks;
			additionalData.executionId = executionId;

			// TODO: support manual and evaluations as well
			const workflowExecute = new WorkflowExecute(
				additionalData,
				msg.executionMode,
				msg.executionData,
			);

			// const workflowRun = workflowExecute.processRunExecutionData(workflow);
			const workflowRun = workflowExecute.run(workflow);

			const run = await workflowRun;

			// console.log(prefix, 'run', run);
			// console.log(prefix, 'run.data.resultData', run.data.resultData);

			parentPort?.postMessage({ type: 'done', run });
			// reportMemory();

			console.log(prefix, 'will shut down cleanly');
			process.exit(0);
		}
	} catch (error) {
		console.error(error);

		throw error;
	}
});

function reportMemory() {
	const memoryUsage = process.memoryUsage();
	console.log(prefix, {
		type: 'memoryReport',
		memory: {
			rss: memoryUsage.rss / 1024 / 1024, // Resident Set Size in MB
			heapTotal: memoryUsage.heapTotal / 1024 / 1024, // Total heap size in MB
			heapUsed: memoryUsage.heapUsed / 1024 / 1024, // Used heap size in MB
			external: memoryUsage.external / 1024 / 1024, // External memory in MB
		},
	});
}

// if (!isMainThread && false) {
// void (async function thread() {
// 	const nodeTypes = Container.get(NodeTypes);
// 	const loadNodesAndCredentials = Container.get(LoadNodesAndCredentials);
//
// 	await loadNodesAndCredentials.init();
//
// 	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
// 	const workflowData: IWorkflowBase = workerData.workflow;
//
// 	const workflow = new Workflow({
// 		id: workflowData.id,
// 		name: workflowData.name,
// 		nodes: workflowData.nodes,
// 		connections: workflowData.connections,
// 		active: workflowData.active,
// 		nodeTypes,
// 		staticData: workflowData.staticData,
// 		settings: {},
// 	});
//
// 	const userId = 'userId';
// 	const additionalData = await WorkflowExecuteAdditionalData.getBase(
// 		'userId',
// 		undefined,
// 		undefined,
// 	);
//
// 	const data: IWorkflowExecutionDataProcess = {
// 		executionMode: 'trigger',
// 		workflowData,
// 		userId,
// 	};
// 	const executionId = '123';
// 	const lifecycleHooks = getLifecycleHooksForRegularMain(data, executionId);
// 	additionalData.hooks = lifecycleHooks;
//
// 	const workflowExecute = new WorkflowExecute(
// 		additionalData,
// 		data.executionMode,
// 		data.executionData,
// 	);
// 	const result = await workflowExecute.processRunExecutionData(workflow);
//
// 	console.log('wt', result);
// 	parentPort?.postMessage(result);
// })();
// }

// export async function doIt(workflow: IWorkflowBase) {
// 	if (!isMainThread) {
// 		return;
// 	}
//
// 	return await new Promise((resolve, reject) => {
// 		const worker = new Worker(__filename, {
// 			workerData: {
// 				workflow,
// 			},
// 			//stdout: false,
// 			//stderr: false,
// 		});
// 		worker.on('message', (msg) => {
// 			console.log('main', `got message: ${msg}`);
// 			resolve(msg);
// 		});
// 		worker.on('error', (error) => {
// 			console.log('main', `got error: [${error.name}] ${error.message}`);
//
// 			reject(error);
// 		});
// 		worker.on('exit', (code) => {
// 			if (code !== 0) {
// 				reject(new Error(`Worker stopped with exit code ${code}`));
// 			}
// 		});
// 	});
// }
