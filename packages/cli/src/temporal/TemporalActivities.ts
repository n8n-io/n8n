/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/prefer-optional-chain */
/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-unused-vars */

/* eslint-disable import/no-cycle */
// Only import the activity types
import Container from 'typedi';
import { NodeTypes } from '@/NodeTypes';

import { Context } from '@temporalio/activity';

import { WorkflowExecute } from 'n8n-core';

import type { IDeferredPromise, IExecuteResponsePromiseData, IRun } from 'n8n-workflow';
import { ErrorReporterProxy as ErrorReporter, LoggerProxy as Logger, Workflow } from 'n8n-workflow';

import type PCancelable from 'p-cancelable';

import config from '@/config';
import type { IWorkflowExecutionDataProcess } from '@/Interfaces';
import * as WorkflowHelpers from '@/WorkflowHelpers';
import * as WorkflowExecuteAdditionalData from '@/WorkflowExecuteAdditionalData';
import { generateFailedExecutionFromError } from '@/WorkflowHelpers';
import { PermissionChecker } from '@/UserManagement/PermissionChecker';
import { ActiveExecutions } from '@/ActiveExecutions';

export async function n8nActivity(
	data: IWorkflowExecutionDataProcess,
	loadStaticData?: boolean,
	restartExecutionId?: string,
	responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
): Promise<string> {
	const workflowId = data.workflowData.id;
	if (loadStaticData === true && workflowId) {
		data.workflowData.staticData = await WorkflowHelpers.getStaticDataById(workflowId);
	}

	const nodeTypes = Container.get(NodeTypes);

	// Soft timeout to stop workflow execution after current running node
	// Changes were made by adding the `workflowTimeout` to the `additionalData`
	// So that the timeout will also work for executions with nested workflows.
	let executionTimeout: NodeJS.Timeout;

	const workflowSettings = data.workflowData.settings ?? {};
	let workflowTimeout = workflowSettings.executionTimeout ?? config.getEnv('executions.timeout'); // initialize with default
	if (workflowTimeout > 0) {
		workflowTimeout = Math.min(workflowTimeout, config.getEnv('executions.maxTimeout'));
	}

	const workflow = new Workflow({
		id: workflowId,
		name: data.workflowData.name,
		nodes: data.workflowData.nodes,
		connections: data.workflowData.connections,
		active: data.workflowData.active,
		nodeTypes,
		staticData: data.workflowData.staticData,
		settings: workflowSettings,
	});
	const additionalData = await WorkflowExecuteAdditionalData.getBase(
		data.userId,
		undefined,
		workflowTimeout <= 0 ? undefined : Date.now() + workflowTimeout * 1000,
	);

	const activeExecutions = Container.get(ActiveExecutions);

	// Register the active execution
	const executionId = await activeExecutions.add(data, undefined, restartExecutionId);
	additionalData.executionId = executionId;

	Logger.verbose(
		`Execution for workflow ${data.workflowData.name} was assigned id ${executionId}`,
		{ executionId },
	);
	let workflowExecution: PCancelable<IRun>;

	try {
		Logger.verbose(
			`Execution for workflow ${data.workflowData.name} was assigned id ${executionId}`,
			{ executionId },
		);

		additionalData.hooks = WorkflowExecuteAdditionalData.getWorkflowHooksMain(
			data,
			executionId,
			true,
		);

		try {
			await PermissionChecker.check(workflow, data.userId);
		} catch (error) {
			ErrorReporter.error(error);
			// Create a failed execution with the data for the node
			// save it and abort execution
			const failedExecution = generateFailedExecutionFromError(
				data.executionMode,
				error,
				error.node,
			);
			additionalData.hooks
				.executeHookFunctions('workflowExecuteAfter', [failedExecution])
				.then(() => {
					activeExecutions.remove(executionId, failedExecution);
				});
			return executionId;
		}

		additionalData.hooks.hookFunctions.sendResponse = [
			async (response: IExecuteResponsePromiseData): Promise<void> => {
				if (responsePromise) {
					responsePromise.resolve(response);
				}
			},
		];

		additionalData.setExecutionStatus = WorkflowExecuteAdditionalData.setExecutionStatus.bind({
			executionId,
		});

		additionalData.sendMessageToUI = WorkflowExecuteAdditionalData.sendMessageToUI.bind({
			sessionId: data.sessionId,
		});

		if (data.executionData !== undefined) {
			Logger.debug(`Execution ID ${executionId} had Execution data. Running with payload.`, {
				executionId,
			});
			const workflowExecute = new WorkflowExecute(
				additionalData,
				data.executionMode,
				data.executionData,
			);
			workflowExecution = workflowExecute.processRunExecutionData(workflow);
		} else if (
			data.runData === undefined ||
			data.startNodes === undefined ||
			data.startNodes.length === 0 ||
			data.destinationNode === undefined
		) {
			Logger.debug(`Execution ID ${executionId} will run executing all nodes.`, { executionId });
			// Execute all nodes

			let startNode;
			if (
				data.startNodes?.length === 1 &&
				Object.keys(data.pinData ?? {}).includes(data.startNodes[0])
			) {
				startNode = workflow.getNode(data.startNodes[0]) ?? undefined;
			}

			// Can execute without webhook so go on
			const workflowExecute = new WorkflowExecute(additionalData, data.executionMode);
			workflowExecution = workflowExecute.run(
				workflow,
				startNode,
				data.destinationNode,
				data.pinData,
			);
		} else {
			Logger.debug(`Execution ID ${executionId} is a partial execution.`, { executionId });
			// Execute only the nodes between start and destination nodes
			const workflowExecute = new WorkflowExecute(additionalData, data.executionMode);
			workflowExecution = workflowExecute.runPartialWorkflow(
				workflow,
				data.runData,
				data.startNodes,
				data.destinationNode,
				data.pinData,
			);
		}

		activeExecutions.attachWorkflowExecution(executionId, workflowExecution);

		if (workflowTimeout > 0) {
			const timeout = Math.min(workflowTimeout, config.getEnv('executions.maxTimeout')) * 1000; // as seconds
			executionTimeout = setTimeout(() => {
				activeExecutions.stopExecution(executionId, 'timeout');
			}, timeout);
		}

		workflowExecution
			.then((fullRunData) => {
				clearTimeout(executionTimeout);
				if (workflowExecution.isCanceled) {
					fullRunData.finished = false;
				}
				fullRunData.status = activeExecutions.getStatus(executionId);
				activeExecutions.remove(executionId, fullRunData);
			})
			.catch((error) => {
				console.log('we must handle this error', error.message);
				// this.processError(error, new Date(), data.executionMode, executionId, additionalData.hooks);
			});
	} catch (error) {
		console.log('we must handle this error', error.message);
		// await this.processError(
		// 	error,
		// 	new Date(),
		// 	data.executionMode,
		// 	executionId,
		// 	additionalData.hooks,
		// );

		// throw error;
	}

	return executionId;
}

export async function doItRight(
	data: IWorkflowExecutionDataProcess,
	executionId: string,
): Promise<Promise<IRun>> {
	const heartbeatInterval = setInterval(() => {
		Context.current().heartbeat();
	}, 6000);
	let workflowExecution: PCancelable<IRun>;
	const nodeTypes = Container.get(NodeTypes);
	const workflowSettings = data.workflowData.settings ?? {};
	let workflowTimeout = workflowSettings.executionTimeout ?? config.getEnv('executions.timeout'); // initialize with default
	if (workflowTimeout > 0) {
		workflowTimeout = Math.min(workflowTimeout, config.getEnv('executions.maxTimeout'));
	}

	const workflow = new Workflow({
		id: data.workflowData.id,
		name: data.workflowData.name,
		nodes: data.workflowData.nodes,
		connections: data.workflowData.connections,
		active: data.workflowData.active,
		nodeTypes,
		staticData: data.workflowData.staticData,
		settings: workflowSettings,
	});

	const additionalData = await WorkflowExecuteAdditionalData.getBase(
		data.userId,
		undefined,
		workflowTimeout <= 0 ? undefined : Date.now() + workflowTimeout * 1000,
	);
	additionalData.executionId = executionId;
	additionalData.hooks = WorkflowExecuteAdditionalData.getWorkflowHooksMain(
		data,
		executionId,
		true,
	);

	if (data.executionData !== undefined) {
		Logger.debug(`Execution ID ${executionId} had Execution data. Running with payload.`, {
			executionId,
		});
		const workflowExecute = new WorkflowExecute(
			additionalData,
			data.executionMode,
			data.executionData,
		);
		workflowExecution = workflowExecute.processRunExecutionData(workflow);
	} else {
		Logger.debug(`Execution ID ${executionId} will run executing all nodes.`, { executionId });
		// Execute all nodes

		let startNode;
		if (
			data.startNodes?.length === 1 &&
			Object.keys(data.pinData ?? {}).includes(data.startNodes[0])
		) {
			startNode = workflow.getNode(data.startNodes[0]) ?? undefined;
		}

		// Can execute without webhook so go on
		const workflowExecute = new WorkflowExecute(additionalData, data.executionMode);
		workflowExecution = workflowExecute.run(
			workflow,
			startNode,
			data.destinationNode,
			data.pinData,
		);
	}

	workflowExecution.then(() => clearInterval(heartbeatInterval));

	return workflowExecution;
}
