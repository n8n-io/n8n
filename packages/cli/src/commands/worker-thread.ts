import { Container } from '@n8n/di';
import { WorkflowExecute } from 'n8n-core';
import { Workflow } from 'n8n-workflow';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { NodeTypes } from '@/node-types';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';

import { WorkerProxyHooks } from './worker-proxy-hooks';
import type { PiscinaExecutionTask, PiscinaExecutionResult } from './worker-types';

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
 * Piscina worker function - executes workflow in worker thread
 * This is the main entry point called by Piscina for each task
 */
// eslint-disable-next-line import-x/no-default-export
export default async function executeWorkflow(
	task: PiscinaExecutionTask,
): Promise<PiscinaExecutionResult> {
	try {
		// Ensure worker is initialized
		await initializeWorker();

		const { workflow: workflowData, executionId, executionMode, executionData, hookPort } = task;

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
		// Main thread has DB access and will handle persistence
		const lifecycleHooks = new WorkerProxyHooks(executionMode, executionId, workflowData, hookPort);
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
		// throw error;
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
