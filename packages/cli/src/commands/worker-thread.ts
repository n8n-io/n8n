import { Container } from '@n8n/di';
import { WorkflowExecute } from 'n8n-core';
import { Workflow } from 'n8n-workflow';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { NodeTypes } from '@/node-types';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';

import { WorkerProxyHooks } from './worker-proxy-hooks';
import type { ChildProcessExecutionTask, ChildProcessExecutionResult } from './worker-types';

let nodeTypes: NodeTypes;

const prefix = '[worker]:';

/**
 * Initialize nodes and credentials once per worker
 * This is called automatically on first task execution
 */
async function initializeWorker() {
	if (!nodeTypes) {
		reportMemory('memory before loading node types');
		console.log(prefix, 'Initializing worker - loading nodes and credentials');
		nodeTypes = Container.get(NodeTypes);
		const loadNodesAndCredentials = Container.get(LoadNodesAndCredentials);
		await loadNodesAndCredentials.init();
		console.log(prefix, 'Worker initialized');
	}
}

/**
 * Execute workflow in child process
 */
async function executeWorkflow(
	task: ChildProcessExecutionTask,
): Promise<ChildProcessExecutionResult> {
	try {
		// Ensure worker is initialized
		await initializeWorker();

		const { workflow: workflowData, executionId, executionMode, executionData } = task;

		// Create workflow instance
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

		// Prepare additional data for execution
		const additionalData = await WorkflowExecuteAdditionalData.getBase({});

		// Use proxy hooks that send events to main thread for DB operations
		const lifecycleHooks = new WorkerProxyHooks(executionMode, executionId, workflowData);
		additionalData.hooks = lifecycleHooks;
		additionalData.executionId = executionId;

		// Execute workflow
		const workflowExecute = new WorkflowExecute(additionalData, executionMode, executionData);
		console.log(prefix, 'going to call workflow execute now');
		const run = workflowExecute.processRunExecutionData(workflow);
		const result = await run;

		return { run: result };
	} catch (error) {
		console.error(prefix, 'Execution failed for', task.executionId, error);
		return {
			run: {
				data: {
					resultData: {
						error: undefined,
						runData: {},
						pinData: undefined,
						lastNodeExecuted: undefined,
						metadata: undefined,
					},
				},
				mode: 'cli',
				startedAt: new Date(),
				status: 'error',
			},
		};
	}
}

/**
 * IPC message handler for child process communication
 * Handles multiple executions without exiting, allowing process reuse
 */
process.on('message', async (msg: any) => {
	if (msg.type === 'execute') {
		console.log(prefix, `Received execute message for ${msg.task.executionId}`);
		const result = await executeWorkflow(msg.task);
		console.log(
			prefix,
			`Workflow execution completed for ${msg.task.executionId}, sending done message`,
		);
		// Send result back with executionId for routing in main thread
		if (process.send) {
			process.send({
				type: 'done',
				executionId: msg.task.executionId,
				run: result.run,
			});
			console.log(prefix, `Done message sent for ${msg.task.executionId}`);
		} else {
			console.error(prefix, `process.send is not available for ${msg.task.executionId}`);
		}
		// Don't exit - keep process alive for reuse
	}
});

setInterval(() => reportMemory(prefix), 5000);
function reportMemory(msg: string = '') {
	const memoryUsage = process.memoryUsage();
	console.log(msg, {
		type: 'memoryReport',
		memory: {
			rss: memoryUsage.rss / 1024 / 1024, // Resident Set Size in MB
			heapTotal: memoryUsage.heapTotal / 1024 / 1024, // Total heap size in MB
			heapUsed: memoryUsage.heapUsed / 1024 / 1024, // Used heap size in MB
			external: memoryUsage.external / 1024 / 1024, // External memory in MB
		},
	});
}
